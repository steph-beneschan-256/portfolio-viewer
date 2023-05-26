import logo from './logo.svg';
import './App.css';
import ShowResults from './ShowResults';
import PortfolioInput from './PortfolioInput';
import { useState } from 'react';

function App() {

  const[inputPortfolio, setInputPortfolio] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const rawStockData = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [chartLoaded, setChartLoaded] = useState(false);
  const [chartSeries, setChartSeries] = useState(null);
  const [finalTotalValue, setFinalTotalValue] = useState(0);
  const [finalStockValues, setFinalStockValues] = useState(new Map());
  const [errMsg, setErrMsg] = useState("");

  function updateInputPortfolio(newPortfolio) {
    setInputPortfolio(newPortfolio);
  }

  // Call when Calculate Results button is clicked
  function calculatePortfolioResults(newPortfolio) {
    if(portfolio !== newPortfolio) {
      setPortfolio(newPortfolio);
      const resultsDiv = document.getElementById("results");
      if(resultsDiv){
        resultsDiv.scrollIntoView();
      }
      //getRawStockData(newPortfolio);
      updateChart(newPortfolio);
    }


  }

  /*
  For a given Date object, create a string in the format
  YYYY-MM-DD,
  to supply to the Marketstack or Twelvedata APIs
  */
  function formatDateStr(date) {
    const y = date.getUTCFullYear().toString().padStart(4,'0');
    const m = date.getUTCMonth().toString().padStart(2, '0');
    const d = date.getUTCDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  
  /*
  Get stock data from the TwelveData API

  NOTE: The Twelvedata support website indicates that all interday data is adjusted for splits:
  https://support.twelvedata.com/en/articles/5179064-are-the-prices-adjusted
  */
  async function getRawStockData(newPortfolio) {

    // if(portfolio !== savedPortfolio.current) {
    //   savedPortfolio.current = portfolio;
    // }
    // else if(rawStockData.current)
    //   return rawStockData.current;

    // const sampleData = require('./twelve-data-sample-data.json');
    // rawStockData.current = sampleData;
    // return sampleData;

    const symbols = newPortfolio.assets.map((a) => a.symbol);

    //const apiKey = "";
    const apiKey = "8bc49cd65a834ef9b55a2110f3a2529c";
    const requestURL = "https://api.twelvedata.com/time_series?"
    + new URLSearchParams({
      apikey: apiKey,
      symbol: symbols.join(','),
      interval: "1month",
      start_date: formatDateStr(new Date(newPortfolio.startDate)),
      end_date: formatDateStr(new Date()),
      outputsize: 5000
      // sort: "ASC" // Seems to not work for some reason
    });

    const reqResponse = await fetch(requestURL);
    if(reqResponse.status === 200) {
      const jsonData = await reqResponse.json();
      if(symbols.length === 1) {
        let toReturn = {};
        toReturn[symbols[0]] = jsonData;
        rawStockData.current = toReturn;
        return toReturn;
      }
      rawStockData.current = jsonData;
      console.log(jsonData);
      return jsonData;
    }
    else {
      //setErrMsg("Sorry, but something went wrong. Please try again in a few moments.");
      return null;
    }

  }

  async function updateChart(newPortfolio) {
    setIsLoading(true);

    const stockData = await getRawStockData(newPortfolio);
    // if(stockData === null) {
    //     setErrMsg("Sorry, but we're having trouble accessing stock data. Please try again in a few moments.")
    //     setIsLoading(false);
    //     return;
    // }

    if(!stockData) {
      //error
      setIsLoading(false);
      return;
    }

    console.log(stockData);

    const stockSymbols = newPortfolio.assets.map((asset) => asset.symbol);
    console.log(stockSymbols);

    /*
    Ensure that data for all stocks in the portfolio was successfully retrieved
    */
    let e = false;
    stockSymbols.forEach((symbol) => {
      if((!stockData[symbol]) || (stockData[symbol].status !== "ok")) {
        setErrMsg("Sorry, but data could not be retrieved for every stock in your portfolio. Please make sure that you entered valid stock symbols.");
        e = true;
        return;
      }
    })
    if(e){
        setIsLoading(false);
        return;
    }

    /*
    Get the number of shares purchased for each stock in the portfolio
    */
    const sharesBought = new Map();
    newPortfolio.assets.forEach((asset) => {
      const assetData = stockData[asset.symbol].values;
      const initialPrice = assetData[assetData.length - 1].close; // assume descending order
      const amountInvested = asset.portion * newPortfolio.initial;
      sharesBought.set(asset.symbol, amountInvested / initialPrice);
    });

    //should we assume that if information on a given date is available for one stock, information will be available for every stock on that date?

    /*
    For each stock, record its value over time, in a format
    that can be passed to the chart thing

    maybe ignore total for now???
    */

    let newChartSeries = [];

    /*
    For every date on which data is available for at least one stock, record what stocks changed on that day and what their new values were afterwards. (This will be used to find the total portfolio's value over time.)
    */
    const valuesByDate = new Map();

    stockSymbols.forEach((symbol) => {
      newChartSeries.push(
        {
          name: symbol,
          type: "area",
          data: 
            stockData[symbol]["values"].map((tradingDay) => {
              const date = tradingDay.datetime;
              const closingPrice = tradingDay.close;
              const assetValue = sharesBought.get(symbol) * closingPrice;

              const v = [[symbol, assetValue]];
              if(!valuesByDate.has(date))
                valuesByDate.set(date, v);
              else
                valuesByDate.set(date, valuesByDate.get(date).concat(v));
    
              return {
                x: date,
                y: assetValue.toFixed(2)
              };
            })
          
        }
      )
    });

    // Estimate total portfolio value over time
    const totalValueSeries = [];

    // Convert date strings to date objects, to enable sorting
    const allDates = Array.from(valuesByDate.keys());
    allDates.sort((a,b) => (new Date(a) - new Date(b)));

    /*
      If a particular stock's price isn't available for a given day, assume that
      its price was the same as its previous price, for the purposes of calculating
      the total portfolio value for that day.
    */
    const currentValues = new Map();
    newPortfolio.assets.forEach((asset) => {
      currentValues.set(asset.symbol, 0);
    })
    let portfolioValue = newPortfolio.initial;
    allDates.forEach((date) => {
      valuesByDate.get(date).forEach(([symbol, newValue]) => {
        currentValues.set(symbol, newValue);
      })
      portfolioValue = Array.from(currentValues.values()).reduce(
        (accumulator, currValue) => (accumulator + currValue), 0);
      
      totalValueSeries.push({
        x: date,
        y: portfolioValue
      });
  
    })
    
    newChartSeries.push({
      name: "Total",
      type: "area",
      data: totalValueSeries
    });

    // Finally, update states

    setChartSeries(newChartSeries);
    setFinalStockValues(stockSymbols.map((symbol) => {
      return {
        symbol: symbol,
        value: currentValues.get(symbol)
      }
    }));
    setFinalTotalValue(portfolioValue);
    setChartLoaded(true);
    setIsLoading(false);

    console.log(newChartSeries);

  }



  return (
    <div className="App">
      <header className="App-header">
        <h1>Portfolio Value Calculator</h1>
      </header>
      <body>
        <PortfolioInput onPortfolioSubmit={calculatePortfolioResults}/>
        <div id="results">
          {portfolio &&
          <ShowResults portfolio={portfolio} stockData={rawStockData.current} finalTotalValue={finalTotalValue} finalStockValues={finalStockValues} chartSeries={chartSeries} />}
        </div>
      </body>
    </div>
  );
}

export default App;
