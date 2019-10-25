import React, {Component} from 'react';
// import ReactDOM from 'react-dom';

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      
    };
  };

  componentDidMount() {

  }

  renderFile() {

  }

  render() {
    return(
      <div>
        <div>SQL Script Generator</div>
        <button onClick={() => this.renderFile}></button>
      </div>
    )
  };
};

// ReactDOM.render(<App/>, document.getElementById('app'));