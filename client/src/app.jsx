import React, {Component} from 'react';
import axios from 'axios';
import DatePicker from "react-datepicker";
import './app.css';
import "react-datepicker/dist/react-datepicker.css";

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      testID: null,
      startDate: null,
      endDate: null,
    };
  };

  componentDidMount() {

  }

  renderFile() {
    // let requestBody = renderBody();
    let requestBody = {
      testID: this.state.testID,
      startDate: this.state.startDate,
      endDate: this.state.endDate,
    }
    axios
    .post(`http://localhost:3001/api/renderfile`, requestBody)
    .then(response => {
      console.log(`Server Response: ${response.data}`);
    });
  };

  handleTestIDChange(e) {
    this.setState({testID: e.target.value});
  };

  handleStartDateChange(e) {
    console.log(e);
    //NEXT get ^^ into preferred format for SQL -> '2019-10-21'
  }

  handleEndDateChange(e) {

  }

  render() {
    return(
      <div className="box">
        <div className="header">SQL Script Generator</div>
        <div className="entries">
          <div className="input-name"><span>TestID</span></div>
          <div className="input-name"><span>Start Date</span></div>
          <div className="input-name"><span>End Date</span></div>
          <input className="entry-input" name="testID" onChange={this.handleTestIDChange}></input>
          <DatePicker dateFormat="yyyy-mm-dd" placeholderText="select start date" className="entry-input" name="startDate" selected={this.state.startDate} onChange={this.handleStartDateChange}/>
          <DatePicker dateFormat="yyyy-mm-dd" placeholderText="select end date" className="entry-input" name="endDate" selected={this.state.endDate} onChange={this.handleEndDateChange}/>
        </div>
        <input className="submit" type="submit" onClick={() => this.renderFile()}></input>
      </div>
    )
  };
};