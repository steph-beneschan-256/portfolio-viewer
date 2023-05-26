import React, { useRef, useState } from 'react';


/*
Create the ShowResults component, which shows the value of the user's assets over time.

Notes:
* As long as we are using the free plan for the Marketstack API, we can only retrieve stock data from the previous year. See:
https://marketstack.com/product

* Currently calculating a stock's value using the following formula:
(p2 - p1) * (i/p1) * 100%
Where:
  p1: price of the stock when the investment was initially made
  p2: current price of the stock
  i: amount of money initially invested into the stock

* I have elected to use Apexcharts to create the chart. Please let me know if this is an issue. See:
https://apexcharts.com/docs/react-charts/
*/

/* 
Import the Chart component from ApexCharts.
Evidently ApexCharts relies on the window API, so server-side rendering needs to be disabled.
Information sources:
- https://stackoverflow.com/a/68598070
- https://nextjs.org/docs/pages/building-your-application/optimizing/lazy-loading#with-no-ssr
*/

import Chart from "react-apexcharts";


// Sample Data from the TwelveData API for stocks AAPL, GOOG, and MSFT
const sampleData = require('./twelve-data-sample-data.json');

// Sample portfolio data for testing purposes
const samplePortfolio = 
{
  initial: 32500.00,
  startDate: "2013-03-20T00:00:00.000Z",
  assets: [
    {
      symbol: "AAPL",
      portion: 0.20
    },
    {
      symbol: "GOOG",
      portion: 0.50
    },
    {
      symbol: "MSFT",
      portion: 0.30
    }
  ]
}

/*
The ShowResults component
*/
export default function ShowResults ({ portfolio=samplePortfolio }) {
  const [isLoading, setIsLoading] = useState(false);
  const [chartLoaded, setChartLoaded] = useState(false);
  const [chartSeries, setChartSeries] = useState(null);
  const [finalTotalValue, setFinalTotalValue] = useState(0);
  const [finalStockValues, setFinalStockValues] = useState(new Map());
  const [errMsg, setErrMsg] = useState("");

  const savedPortfolio = useRef(null);

  const rawStockData = useRef(null);

  // Chart display options
  const chartOptions = {
    chart: {
      width: "100%",
    },
    xaxis: {
      type: "datetime",
    },
    yaxis: {
      labels: {
        formatter: function(value, index) {
          return value.toLocaleString("en-US", {style: "currency", currency: "USD"});
        }
      }
    },
    // https://apexcharts.com/javascript-chart-demos/bar-charts/custom-datalabels/
    dataLabels: {
      enabled: false,
    },
  };

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
  async function getRawStockData() {

    if(rawStockData.current)
      return rawStockData.current;

    // let useSampleData = true;
    // useSampleData = false;

    // if(useSampleData) {
    //   rawStockData.current = sampleData;
    //   return sampleData;
    // }

    const symbols = portfolio.assets.map((a) => a.symbol);

    //const apiKey = "";
    const apiKey = "8bc49cd65a834ef9b55a2110f3a2529c";
    const requestURL = "https://api.twelvedata.com/time_series?"
    + new URLSearchParams({
      apikey: apiKey,
      symbol: symbols.join(','),
      interval: "1month",
      start_date: formatDateStr(new Date(portfolio.startDate)),
      end_date: formatDateStr(new Date()),
      outputsize: 5000
      // sort: "ASC" // Seems to not work for some reason
    });

    const reqResponse = await fetch(requestURL);
    if(reqResponse.status === 200) {
      const jsonData = await reqResponse.json();
      rawStockData.current = jsonData;
      console.log(jsonData);
      return jsonData;
    }
    else {
      setErrMsg("Sorry, but something went wrong.");
      return null;
    }

  }

  /*
  Update the chart, using the raw stock data
  */
  async function updateChart() {
    setIsLoading(true);

    const stockData = await getRawStockData();
    if(stockData === null) {
        setErrMsg("Sorry, but we're having trouble accessing stock data. Please try again in a few moments.")
        setIsLoading(false);
        return;
    }

    const stockSymbols = portfolio.assets.map((asset) => asset.symbol);
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
    portfolio.assets.forEach((asset) => {
      const assetData = stockData[asset.symbol].values;
      const initialPrice = assetData[assetData.length - 1].close; // assume descending order
      const amountInvested = asset.portion * portfolio.initial;
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
    portfolio.assets.forEach((asset) => {
      currentValues.set(asset.symbol, 0);
    })
    let portfolioValue = portfolio.initial;
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

  }

  if(portfolio !== savedPortfolio.current) {
    savedPortfolio.current = portfolio;
    updateChart();
  }


  return (
    <div className="showResults">
        {
        isLoading && (
          <div>
            loading...
          </div>
        )}

        <div>
            {errMsg &&
            <div class="errMsg">
                ⚠ {errMsg}
            </div>
            }
        </div>

        <>  
          {(chartLoaded && chartOptions && chartSeries) && 
            <>
            <div className="resultsChartContainer">
              <Chart
                type="area"
                options={chartOptions}
                series={chartSeries}
              />
            </div>
            <h2>
              Your portfolio's value today:
            </h2>
            <h3>
              Total: {finalTotalValue.toLocaleString("en-US", {style: "currency", currency: "USD"})}
            </h3>
            {
              finalStockValues.map((data) => (
                <h4>
                  {data.symbol}: {data.value.toLocaleString("en-US", {style: "currency", currency: "USD"})}
                </h4>
              ))
            }
            </>
          }
        </>
      </div>

  );
};
