import React, { useEffect, useRef, useState } from 'react';

import Chart from "react-apexcharts";

export default function PortfolioInput({onPortfolioSubmit}) {
    // Highest number of stocks that can be included in the user's portfolio
    const MAX_STOCKS_ALLOWED = 7;

    const [errMsg, setErrMsg] = useState("");

    // Date of portfolio creation
    const [creationDate, setCreationDate] = useState("2013-05-26");


    const [stockWidgetIDs, setStockWidgetIDs] = useState([0,1]);

    const defaultValues = {
        symbols: ["GOOG", "AAPL"],
        portions: ["30", "70"],
        budget: 30000
    };


    // Amount of money to initially invest
    const [investmentAmount, setInvestmentAmount] = useState(defaultValues.budget);

    const [inputStockSymbols, setInputStockSymbols] = useState(defaultValues.symbols);
    const [inputStockPortions, setInputStockPortions] = useState(defaultValues.portions);
    
    const totalPortionAllocated = useRef(100);

    // Data shown on the chart; has already been validated
    const [chartStockSymbols, setChartStockSymbols] = useState(
        defaultValues.symbols.map((s, i) => `${s}: ${formatCurrencyAmount(parseFloat(defaultValues.portions[i])/100 * defaultValues.budget)} `)
    );
    const [chartStockPortions, setChartStockPortions] = useState(defaultValues.portions.map((p) => parseFloat(p)));

    // Is this too much to load into memory?
    //const USDStockSymbols = require('./twelvedata-usd-symbols.json');

    // useEffect(() => {redrawChart();})

    function inputIsValid() {
        return (totalPortionAllocated.current === 100);
    }

    // Wrapper for the localeString function
    function formatCurrencyAmount(amount) {
        return amount.toLocaleString("en-US", {style: "currency", currency: "USD"})
    }


    function updateInputStockSymbols(newSymbol, newSymbolIndex) {
        const newSymbols = inputStockSymbols.map((currentSymbol, index) => {
            return (index===newSymbolIndex) ? newSymbol : currentSymbol;
        });

        setInputStockSymbols(newSymbols);
        redrawChart(newSymbols, inputStockPortions);
    }

    function updateInputStockPortions(newPortion, newPortionIndex) {
        const p = newPortion ? parseFloat(newPortion) : 0;
        if((p !== undefined) && (p >= 0) && (p <= 100)) {
            const p2 = inputStockPortions[newPortionIndex] ? parseFloat(inputStockPortions[newPortionIndex]) : 0;
            totalPortionAllocated.current = totalPortionAllocated.current - p2 + p;
            const newInputStockPortions = inputStockPortions.map((currentPortion, index) => {
                return (index===newPortionIndex) ? newPortion : currentPortion;
            });
            redrawChart(inputStockSymbols, newInputStockPortions);
            setInputStockPortions(newInputStockPortions);
        }
    }

    function addStockWidget() {
        if(stockWidgetIDs.length < MAX_STOCKS_ALLOWED) {
            const newSymbols = inputStockSymbols.concat([`Stock${stockWidgetIDs.length+1}`]);
            const newPortions = inputStockPortions.concat(["0"]);
            setInputStockSymbols(newSymbols);
            setInputStockPortions(newPortions);
            setStockWidgetIDs(stockWidgetIDs.concat([stockWidgetIDs.length]));
            redrawChart(newSymbols, newPortions);
        }
       
    }

    function removeStockWidget(widgetID) {
        if(stockWidgetIDs.length > 1) {
            totalPortionAllocated.current = (totalPortionAllocated.current - parseFloat(inputStockPortions[widgetID]));
            const newSymbols = inputStockSymbols.slice(0, widgetID).concat(inputStockSymbols.slice(widgetID+1));
            const newPortions = inputStockPortions.slice(0, widgetID).concat(inputStockPortions.slice(widgetID+1));
            setInputStockSymbols(newSymbols);
            setInputStockPortions(newPortions);
            setStockWidgetIDs(stockWidgetIDs.slice(0,-1))
            redrawChart(newSymbols, newPortions);
        }
        
    }

    async function redrawChart(symbols=inputStockSymbols, portions=inputStockPortions) {
        if(totalPortionAllocated.current === 100) {
            setErrMsg("");
            setChartStockSymbols(symbols.map((s, i) => `${s}: ${formatCurrencyAmount(parseFloat(portions[i])/100 * investmentAmount)} `));
            setChartStockPortions(portions.map((p) => parseFloat(p))); 
        }
        else{
            setErrMsg("Values don't add up to 100 percent");
        }

    }

    function submitPortfolio() {
        if(inputIsValid()) {
            onPortfolioSubmit({
                initial: investmentAmount,
                startDate: creationDate,
                assets: inputStockSymbols.map((symbol, index) => {
                    return {
                        symbol: symbol,
                        portion: inputStockPortions[index]/100
                    }
                })
            });
        }
    }

    return (
        <div>
            <div className="instructions">
                Want to find out what a hypothetical stock portfolio would be worth today?
                <br/><br />
                Please enter the total amount of the initial investment, the date
                on which the stock shares were bought, and up to 7 stocks.
                <br /><br />
                For each stock,
                indicate the stock symbol (e.g. GOOG, AAPL, AMZN, TSLA, MSFT) as well as the portion of the investment allocated
                to that stock.
            </div>
            <div className="portfolio-input">
                <label className="budget-input">
                    Total Money Invested:
                    <div>
                        <span className="dollar-sign-label">$</span>
                        <input type="number" value={investmentAmount}
                        min="1" max="1000000000"
                        onChange={(e)=>{setInvestmentAmount(e.target.value)}}>
                        </input>
                    </div>
                </label>

                <label>
                    Portfolio Creation Date:
                    <div>
                        <input type="date" value={creationDate}
                        min="2000-01-01" max="2023-05-25"
                        onChange={(e)=>{setCreationDate(e.target.value)}}>
                        </input>
                    </div>

                </label>

                <div className="stock-widgets-container">
                {
                    stockWidgetIDs.map((widgetID, index) => {
                        return (
                            <div class="stock-widget-container">
                                <div className="stockWidget">
                                    <div className="remove-button-container">
                                        <button className="remove-button" onClick={() => {removeStockWidget(widgetID)}} disabled={stockWidgetIDs.length <= 1}>
                                            - Remove
                                        </button>
                                    </div>

                                    <label>
                                        <span>Stock Symbol:</span>
                                        <br/>
                                        <input type="text"
                                        maxLength={10}
                                        value={inputStockSymbols[widgetID]}
                                        onChange={(e)=>{updateInputStockSymbols(e.target.value, widgetID)}}>
                                        </input>
                                    </label>
                                    <label>
                                        <span>Percent of Budget to Allocate:</span>
                                        <br/>
                                        <input type="number"
                                        step="0.01" min="0" max="100"
                                        value={inputStockPortions[widgetID]}
                                        onChange={(e)=>{updateInputStockPortions(e.target.value, widgetID)}}>
                                        </input>  
                                        <span className="percent-label">%</span>
                                    </label>
                                </div>
                            </div>
                        )
                    })
                }
                </div>

                <button className="add-button" onClick={addStockWidget} disabled={stockWidgetIDs.length >= MAX_STOCKS_ALLOWED}>+ Add Stock</button>

                {/* <button onClick={dataSubmitted}>
                    Update Chart
                </button> */}

                <div>
                    {errMsg &&
                    <div class="errMsg">
                        ⚠ {errMsg}
                    </div>
                    }
                </div>

            </div>

            <div className="allocation-chart">
                <h4>Your Portfolio Allocation:</h4>
                <div className="inputChartContainer">
                <Chart
                    type="pie"
                    options={{"labels": chartStockSymbols}}
                    series={chartStockPortions}
                />
                </div>
            </div>


            <button className="calculate-results-button" onClick={submitPortfolio} disabled={!inputIsValid()}>
                Calculate Results
            </button>


        </div>
    )
}