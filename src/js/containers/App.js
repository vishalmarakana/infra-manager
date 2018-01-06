import React, { Component } from 'react'
import { Switch, Route } from 'react-router-dom'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Helmet } from 'react-helmet'
import io from 'socket.io-client'

import { setCredentials, setComplete, setLoading, setExhaustive, setReport } from '../actions'
import { Dashboard, Services, Map, Users, Statistics, Settings, Accesses, VehicularFlow, Perimeter, FacialRecognition, Cctv, Reports } from './'
import { Navigator } from '../components'
import { NetworkOperation } from '../lib'

class App extends Component {
  componentDidMount() {
    const token = localStorage.getItem('token')
    const path = `${this.props.location.pathname}${this.props.location.search}`

    if (!token) {
      localStorage.removeItem('token')
      this.props.history.replace(`/login?return=${path}`)
      return
    }

    this.props.setLoading()

    NetworkOperation.getSelf()
    .then(({data}) => {
      this.props.setCredentials({...data.user, token})

      // Start socket connection
      // this.initSockets(this.props, token)
      return NetworkOperation.getExhaustive()
    })
    .then(({data}) => {
      // Set all zones
      this.props.setExhaustive(data.zones)

      this.props.setComplete()
    })
    .catch(error => {
      let { response = {} } = error
      this.props.setComplete()

      switch (response.status) {
        case 401:
        case 400:
          this.props.history.replace(`/login?return=${path}`)
          break
        default:
          // TODO Display error
          break
      }
    })
  }

  initSockets(props, token) {
    this.socket = io()
    // this.socket.emit('join', token)

    this.socket.on('connect', () => {
      this.socket.emit('join', token)
    })

    // this.socket.on('reload', () => {
    //   console.log('Got reload')
    // })

    this.socket.on('report', report => {
      props.setReport(report)
    })
  }

  render() {
    return (
      <div id="app">
        <Helmet>
          <title>Connus</title>
        </Helmet>
        <Navigator />
        <Switch>
          <Route exact path="/" component={Dashboard}/>
          <Route path="/sites/:zoneId?/:subzoneId?/:siteId?" component={Map} />
          <Route path="/users" component={Users}/>
          <Route path="/accesses" component={Accesses}/>
          <Route path="/vehicular-flow" component={VehicularFlow}/>
          <Route path="/perimeter" component={Perimeter}/>
          <Route path="/facial-recognition" component={FacialRecognition}/>
          <Route path="/statistics" component={Statistics}/>
          <Route path="/cctv" component={Cctv}/>
          <Route path="/reports" component={Reports}/>
          <Route path="/settings" component={Settings}/>
        </Switch>
      </div>
    )
  }
}

App.propTypes = {
  setCredentials: PropTypes.func,
  history: PropTypes.object,
  user: PropTypes.object,
  credentials: PropTypes.object
}

function mapDispatchToProps(dispatch) {
  return {
    setReport: report => {
      dispatch(setReport(report))
    },
    setCredentials: user => {
      dispatch(setCredentials(user))
    },
    setLoading: () => {
      dispatch(setLoading())
    },
    setComplete: () => {
      dispatch(setComplete())
    },
    setExhaustive: zones => {
      dispatch(setExhaustive(zones))
    }
  }
}

function mapStateToProps({loading, credentials}) {
  return {
    loading,
    credentials
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(App)
