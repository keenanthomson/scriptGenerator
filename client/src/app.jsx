import React, {Component} from 'react';
import axios from 'axios';
import DatePicker from "react-datepicker";
import './app.css';
import 'react-datepicker/dist/react-datepicker.css';

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      testID: null,
      startDate: null,
      endDate: null,
      platforms: null,
      devices: null,
      OS: null,
    };
    this.handleTestIDChange = this.handleTestIDChange.bind(this);
    this.handleStartDateChange = this.handleStartDateChange.bind(this);
    this.handleEndDateChange = this.handleEndDateChange.bind(this);
    this.handlePlatformChange = this.handlePlatformChange.bind(this);
    this.handleDeviceChange = this.handleDeviceChange.bind(this);
    this.handleOSChange = this.handleOSChange.bind(this);
  };

  // componentDidMount() {

  // }

  renderFile() {
    if (!this.state.startDate | !this.state.endDate) {
      return alert(`You must select a Start and End Date.`);
    };

    let requestBody = {
      startDate: this.state.startDate,
      endDate: this.state.endDate,
      testID: this.state.testID,
      platforms: this.state.platforms,
      devices: this.state.devices,
      OS: this.state.OS,
    };

    console.log(requestBody)
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
    this.setState({startDate: date});
  };

  handleEndDateChange(date) {
    this.setState({endDate: date});
  };

  handlePlatformChange(e) {
    this.setState({platforms: e.target.value});
  };

  handleDeviceChange(e) {
    this.setState({devices: e.target.value});
  };

  handleOSChange(e) {
    this.setState({OS: e.target.value});
  };

  render() {
    return(
      <div className="box">
        <div className="header">SQL Script Generator<br/>PDP Customer- and Session-level Test KPIs</div>
        <div className="entries">
        <div className="input-name"><span>Analyst Initials</span></div>
          <div className="input-name"><span>Test Name</span></div>
          <div></div>
          <input className="entry-input" name="initials" onChange={this.handleInitialChange}></input>
          <input className="entry-input" name="testName" onChange={this.handleTestNameChange}></input>
          <div></div>
          <div className="input-name"><span>TestID</span></div>
          <div className="input-name"><span>Start Date</span></div>
          <div className="input-name"><span>End Date</span></div>
          <input className="entry-input" name="testID" onChange={this.handleTestIDChange}></input>
          <DatePicker dateFormat="yyyy-MM-dd" placeholderText="select start date" className="entry-input" name="startDate" maxDate={new Date()} selected={this.state.startDate} onChange={this.handleStartDateChange}/>
          <DatePicker dateFormat="yyyy-MM-dd" placeholderText="select end date" className="entry-input" name="endDate" minDate={this.state.startDate} maxDate={new Date()} selected={this.state.endDate} onChange={this.handleEndDateChange}/>
          <div className="input-name"><span>Platform(s)</span></div>
          <div className="input-name"><span>Device(s)</span></div>
          <div className="input-name"><span>Operating System(s)</span></div>
          <div className="checkbox-div" onChange={this.handlePlatformChange}>
            <input type="checkbox" value="1"/> Desktop<br/>
            <input type="checkbox" value="2"/> Mweb<br/>
            <input type="checkbox" value="3"/> App
          </div>
          <div className="checkbox-div" onChange={this.handleDeviceChange}>
            <input type="checkbox" value="1"/> Desktop<br/>
            <input type="checkbox" value="2"/> Tablet<br/>
            <input type="checkbox" value="3"/> Phone
          </div>
          <div className="checkbox-div" onChange={this.handleOSChange}>
            <input type="checkbox" value="1"/> Windows<br/>
            <input type="checkbox" value="2"/> OS X<br/>
            <input type="checkbox" value="3"/> Linux<br/>
            <input type="checkbox" value="4"/> Chrome OS<br/>
            <input type="checkbox" value="5"/> iOS<br/>
            <input type="checkbox" value="6"/> Android
          </div>
        </div>
        <input className="submit" type="submit" onClick={() => this.renderFile()}></input>
      </div>
    )
  };
};