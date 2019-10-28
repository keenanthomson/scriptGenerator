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
    this.handleStartDateChange = this.handleStartDateChange.bind(this);
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

  handleStartDateChange(date) {
    console.log(this.formatDate(date))
    
    //NEXT get ^^ into preferred format for SQL -> '2019-10-21'

    // this.setState({startDate: e});
  }

  formatDate(date) {
    let splitData = new Intl.DateTimeFormat().format(date).split("/");
    let formattedDate;
    console.log(splitData[2])
    for (let i = splitData.length - 1; i < 0; i--) {
      console.log(splitData[i]) // not working as I expect, undefined instead of '2019'
      formattedDate = formattedDate + `${splitData[i]}-`;
    }
    return formattedDate;
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
          <DatePicker dateFormat="yyyy-mm-dd" placeholderText="select start date" className="entry-input" name="startDate" maxDate={new Date()} selected={this.state.startDate} onChange={this.handleStartDateChange}/>
          <DatePicker dateFormat="yyyy-mm-dd" placeholderText="select end date" className="entry-input" name="endDate" selected={this.state.endDate} onChange={this.handleEndDateChange}/>
        </div>
        <input className="submit" type="submit" onClick={() => this.renderFile()}></input>
      </div>
    )
  };
};