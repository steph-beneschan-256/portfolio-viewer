import logo from './logo.svg';
import './App.css';
import ShowResults from './ShowResults';
import PortfolioInput from './PortfolioInput';
import { useState } from 'react';

function App() {

  const [portfolio, setPortfolio] = useState(null);

  // Call when Calculate Results button is clicked
  function calculatePortfolioResults(newPortfolio) {
    if(portfolio !== newPortfolio) {
      setPortfolio(newPortfolio);
      const resultsDiv = document.getElementById("results");
      if(resultsDiv){
        resultsDiv.scrollIntoView();
      }
    }


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
          <ShowResults portfolio={portfolio} />}
        </div>
      </body>
    </div>
  );
}

export default App;
