import React from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import ScriptsDashboard from './scripts-dashboard';
import Setting from './setting';
import './App.global.css';


export default function App() {
  return (
    <Router>
      <Switch>
        <Route path='/setting' component={Setting}></Route>
        <Route path="/" component={ScriptsDashboard} />
      </Switch>
    </Router>
  );
}
