import logo from './logo.svg';
import './App.css';
import ShowResults from './ShowResults';
import PortfolioInput from './PortfolioInput';
import { useState } from 'react';

function App() {

  const [portfolio, setPortfolio] = useState(null);

  function calculatePortfolioResults(newPortfolio) {
    if(portfolio !== newPortfolio)
      setPortfolio(newPortfolio);

  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Portfolio Value Calculator</h1>
      </header>
      <body>
        <PortfolioInput onPortfolioSubmit={calculatePortfolioResults}/>
        {portfolio &&
        <ShowResults portfolio={portfolio} />}
      </body>
    </div>
  );
}

export default App;
