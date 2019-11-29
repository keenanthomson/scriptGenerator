import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from "react-datepicker";
import './app.css';
import 'react-datepicker/dist/react-datepicker.css';

export default function App() {
  const [Initials, setInitials] = useState(null);
  const [TestName, setTestName] = useState(null);
  const [TestID, setTestID] = useState(null);
  const [StartDate, setStartDate] = useState(null);
  const [EndDate, setEndDate] = useState(null);
  const [Platforms, setPlatforms] = useState([]);
  const [Devices, setDevices] = useState([]);
  const [Stores, setStores] = useState([]);
  const [OS, setOS] = useState([]);
  const [ClickLocationInput, setClickLocationInput] = useState("");
  const [WebActionInput, setWebActionInput] = useState("");
  const [InViewInput, setInViewInput] = useState("");
  const [script1, setScript1] = useState(null);
  const [script2, setScript2] = useState(null);
  const [ShowScript1, setShowScript1] = useState(false);
  const [ShowScript2, setShowScript2] = useState(false);

  function renderScript () {
    if (!StartDate | !EndDate) {
      return alert(`You must select a Start and End Date.`);
    };

    let requestBody = {
      initials: Initials || undefined,
      testName: TestName || undefined,
      testID: TestID || undefined,
      startDate: StartDate,
      endDate: EndDate,
      platforms: Platforms,
      devices: Devices,
      stores: Stores,
      OS: OS,
      ClickLocation: ClickLocationInput,
      WebAction: WebActionInput,
      InView: InViewInput,
    };

    axios
    .post(`http://localhost:3001/api/renderscripts`, requestBody)
    .then(response => {
      setScript1(response.data.script1);
      setShowScript1(true);
      setShowScript2(false);
      setScript2(response.data.script2);
    })
    .catch(err => {
      console.log(`Error with renderfile API call: `, err);
    })
  };

  function updateStateArray(e, state, setStateFunc) {
    let value = Number(e.target.value);
    if (state.indexOf(value) >= 0) {
      let index = state.indexOf(value);
      state.splice(index, 1);
      setStateFunc(state);
    } else {
      state.push(value);
      setStateFunc(state);
    };
  };

  function ScriptPreview() {
    if (script1 && ShowScript1) {
      return <pre>{script1}</pre>
    } else if (script2 && ShowScript2) {
      return <pre>{script2}</pre>
    };
  };

  function CopyButton() {
    if (ShowScript1) {
      return <input className="button noSelect" type="button" value="Copy" onClick={() => copyScript(script1)}></input>
    } else if (ShowScript2) {
      return <input className="button noSelect" type="button" value="Copy" onClick={() => copyScript(script2)}></input>     
    };
  };

  function copyScript(scriptName) {
    navigator.clipboard.writeText(scriptName).then(() => {
      alert(`Script copied to clipboard.`)
    });
  };

  function RenderScriptButtons() {
    if (script1) {
      return (
        <div className='button-tabs'>
        <div className='button-grid'>
          {Script1Button()}
          {Script2Button()}
        </div>
      </div>
      )
    }
  }

  function Script1Button() {
    if (script1 && ShowScript1) {
      return <input className="button-toggle-selected noSelect" type="button" value="KPI Script" onClick={() => toggleScript1()}></input>
    } else if (script1) {
      return <input className="button-toggle noSelect" type="button" value="KPI Script" onClick={() => toggleScript1()}></input>
    };
  };

  function Script2Button() {
    if (script2 && ShowScript2) {
      return <input className="button-toggle-selected noSelect" type="button" value="Tracking Script" onClick={() => toggleScript2()}></input>
    } else if (script2) {
      return <input className="button-toggle noSelect" type="button" value="Tracking Script" onClick={() => toggleScript2()}></input>      
    };
  };

  function toggleScript1() {
    if (!ShowScript1) {
      setShowScript2(false);
      setShowScript1(true);
    };
  };

  function toggleScript2() {
    if (!ShowScript2) {
      setShowScript1(false);
      setShowScript2(true);
    };
  };

    return(
      <div className="box">
        <div className="header">SQL Script Generator</div>
        <div className="entries-header">
          PRIMARY KPIS SCRIPT
        </div>
        <div className="entries-primary">
        <div className="input-name"><span>Analyst Initials</span></div>
          <div className="input-name"><span>Test Name</span></div>
          <div></div>
          <div></div>
          <input className="entry-input" name="initials" onChange={(e) => setInitials(e.target.value)}></input>
          <input className="entry-input" name="testName" onChange={(e) => setTestName(e.target.value)}></input>
          <div></div>
          <div></div>
          <div className="input-name"><span>TestID</span></div>
          <div className="input-name"><span>Start Date</span></div>
          <div className="input-name"><span>End Date</span></div>
          <div></div>
          <input className="entry-input" name="testID" onChange={(e) => setTestID(e.target.value)}></input>
          <DatePicker dateFormat="yyyy-MM-dd" placeholderText="select start date" className="entry-input" name="startDate" maxDate={new Date()} selected={StartDate} onChange={(e) => setStartDate(e)}/>
          <DatePicker dateFormat="yyyy-MM-dd" placeholderText="select end date" className="entry-input" name="endDate" minDate={StartDate} maxDate={new Date()} selected={EndDate} onChange={(e) => setEndDate(e)}/>
          <div></div>
          <div className="input-name"><span>Platform(s)</span></div>
          <div className="input-name"><span>Device(s)</span></div>
          <div className="input-name"><span>Store(s)</span></div>
          <div className="input-name"><span>Operating System(s)</span></div>
          <div className="checkbox-div" onChange={(e) => updateStateArray(e, Platforms, setPlatforms)}>
            <input type="checkbox" value="1"/> Desktop<br/>
            <input type="checkbox" value="2"/> Mweb<br/>
            <input type="checkbox" value="3"/> App
          </div>
          <div className="checkbox-div" onChange={(e) => updateStateArray(e, Devices, setDevices)}>
            <input type="checkbox" value="1"/> Desktop<br/>
            <input type="checkbox" value="2"/> Tablet<br/>
            <input type="checkbox" value="3"/> Phone
          </div>
          <div className="checkbox-div" onChange={(e) => updateStateArray(e, Stores, setStores)}>
            <input type="checkbox" value="49"/> Wayfair<br/>
            <input type="checkbox" value="321"/> Wayfair UK<br/>
            <input type="checkbox" value="446"/> Wayfair CA<br/>
            <input type="checkbox" value="368"/> Wayfair DE<br/>
            <input type="checkbox" value="450"/> Joss & Main<br/>
            <input type="checkbox" value="81"/> AllModern<br/>
            <input type="checkbox" value="422"/> Birch Lane<br/>
            <input type="checkbox" value="457"/> Perigold
          </div>
          <div className="checkbox-div" onChange={(e) => updateStateArray(e, OS, setOS)}>
            <input type="checkbox" value="1"/> Windows<br/>
            <input type="checkbox" value="2"/> OS X<br/>
            <input type="checkbox" value="3"/> Linux<br/>
            <input type="checkbox" value="4"/> Chrome OS<br/>
            <input type="checkbox" value="5"/> iOS<br/>
            <input type="checkbox" value="6"/> Android
          </div>
        </div>
        <div className="entries-header">
          TRACKING SCRIPT <i>(comma separated, no spaces)</i>
        </div>
        <div className="entries-secondary">
          <div className="entries-secondary-grid">
            <span>ClickLocation</span>
            <input className="input-tracking" value={ClickLocationInput} onChange={(e) => setClickLocationInput((e.target.value).toUpperCase())}></input>
          </div>
          <div className="entries-secondary-grid">
            <span>WebAction</span>
            <input className="input-tracking" value={WebActionInput} onChange={(e) => setWebActionInput((e.target.value).toUpperCase())}></input>
          </div>
          <div className="entries-secondary-grid">
            <span>InView</span>
            <input className="input-tracking" value={InViewInput} onChange={(e) => setInViewInput((e.target.value).toUpperCase())}></input>
          </div>
        </div>
        <div className='button-grid'>
          <input className="button button-submit noSelect" type="submit" onClick={() => renderScript()}></input>
          {CopyButton()}
        </div>
        {RenderScriptButtons()}
        <div>
          {ScriptPreview()}
        </div>
      </div>
    );
};