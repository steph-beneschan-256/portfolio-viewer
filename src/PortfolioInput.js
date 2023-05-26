import React, { useRef, useState } from 'react';

import Chart from "react-apexcharts";

export default function PortfolioInput({onPortfolioSubmit}) {
    // Highest number of stocks that can be included in the user's portfolio
    const MAX_STOCKS_ALLOWED = 7;

    const [errMsg, setErrMsg] = useState("");

    // Data shown on the chart; has already been validated
    const [chartStockSymbols, setChartStockSymbols] = useState(["GOOG", "AAPL"]);
    const [chartStockPortions, setChartStockPortions] = useState([30, 70]);

    // Amount of money to initially invest
    const [investmentAmount, setInvestmentAmount] = useState(30000);

    // Date of portfolio creation
    const [creationDate, setCreationDate] = useState("2013-05-26");


    const [stockWidgetIDs, setStockWidgetIDs] = useState([0,1]);

    const [inputStockSymbols, setInputStockSymbols] = useState(["GOOG", "AAPL"]);
    const [inputStockPortions, setInputStockPortions] = useState(["30", "70"]);


    function updateInputStockSymbols(newSymbol, newSymbolIndex) {

        setInputStockSymbols(
            inputStockSymbols.map((currentSymbol, index) => {
                return (index===newSymbolIndex) ? newSymbol : currentSymbol;
            })
        )
    }

    function updateInputStockPortions(newPortion, newPortionIndex) {
        setInputStockPortions(
            inputStockPortions.map((currentPortion, index) => {
                return (index===newPortionIndex) ? newPortion : currentPortion;
            })
        )
    }

    function addStockWidget() {
        if(stockWidgetIDs.length < MAX_STOCKS_ALLOWED) {
            setInputStockSymbols(
                inputStockSymbols.concat([""])
            );
            setInputStockPortions(
                inputStockPortions.concat([0])
            );
            setStockWidgetIDs(stockWidgetIDs.concat([stockWidgetIDs.length]));
        }
    }

    function removeStockWidget(widgetID) {
        if(stockWidgetIDs.length > 1) {
            setInputStockSymbols(
                inputStockSymbols.slice(0, widgetID).concat(inputStockSymbols.slice(widgetID+1))
            );
            setInputStockPortions(
                inputStockPortions.slice(0, widgetID).concat(inputStockPortions.slice(widgetID+1))
            );
            setStockWidgetIDs(stockWidgetIDs.slice(0,-1))
        }
    }

    function dataSubmitted(e) {
        e.preventDefault(); // probably not necessary but ???
        inputStockSymbols.forEach((symbol) => {
            //TODO: check whether the symbol is a valid stock symbol
            if(symbol === "") {
                setErrMsg("Invalid data");
                return;
            }
        })

        // Verify that all percentages add up to 100%
        let totalPercentAllocated = 0;
        console.log(inputStockPortions);
        inputStockPortions.forEach((p) => {
            console.log(p);
            totalPercentAllocated += parseFloat(p);
        })
        if(totalPercentAllocated !== 100) {
            console.log(totalPercentAllocated);
            setErrMsg("Values do not add up to 100%");
            return;
        }

        // Clear error message and update chart
        setErrMsg("");
        setChartStockSymbols(inputStockSymbols);
        setChartStockPortions(inputStockPortions.map((p) => parseFloat(p)));

    }

    function submitPortfolio() {
        onPortfolioSubmit({
            initial: investmentAmount,
            startDate: creationDate,
            assets: chartStockSymbols.map((symbol, index) => {
                return {
                    symbol: symbol,
                    portion: chartStockPortions[index]/100
                }
            })
        });
    }

    function addStockButtonClicked() {
        // if(stockWidgets.length < 5) {
        //     const newStockID = stockWidgets.length;
        //     setStockWidgets(
        //         stockWidgets.concat([
        //             <label>
        //                 Stock {newStockID}:
        //                 <div>
        //                     <input type="text" name={`stocksymbol-${newStockID}`}></input>
        //                     <input type="text" name={`stockportion-${newStockID}`}></input> %
        //                 </div>
        //             </label>
        //         ])
        //     )
        // }

    }

    function removeStockButtonClicked(index) {
        // if(stockWidgets.length > 1) {
        //     setStockWidgets(
        //         stockWidgets.slice(0,index).concat(stockWidgets.slice(index+1))
        //     );
        // };
    }

    return (
        <div>
            <label>
                Total Money Initially Invested:
                <div>
                    $
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

            {
                stockWidgetIDs.map((widgetID, index) => {
                    return (
                        <label>
                            Stock {widgetID+1}:
                            <div>
                                <input type="text"
                                value={inputStockSymbols[widgetID]}
                                onChange={(e)=>{updateInputStockSymbols(e.target.value, widgetID)}}>
                                </input>

                                <input type="number"
                                step="0.01" min="0" max="100"
                                value={inputStockPortions[widgetID]}
                                onChange={(e)=>{updateInputStockPortions(e.target.value, widgetID)}}>
                                </input> %

                                <button onClick={() => {removeStockWidget(widgetID)}} disabled={stockWidgetIDs.length <= 1}>Remove</button>
                            </div>
                        </label>
                    )
                })
            }

            <button onClick={addStockWidget} disabled={stockWidgetIDs.length >= MAX_STOCKS_ALLOWED}>+ Add Stock</button>

            <button onClick={dataSubmitted}>
                Update Chart
            </button>

            <div>
                {errMsg}
            </div>

            <div className="inputChartContainer">
              <Chart
                type="pie"
                options={{"labels": chartStockSymbols}}
                series={chartStockPortions}
              />
            </div>

            <button onClick={submitPortfolio}>
                Calculate Results
            </button>


        </div>
    )
}