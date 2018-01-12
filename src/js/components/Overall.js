import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'

import { StatusesContainer } from './'
import Constants from '../lib/constants'
import { substractReportValues, getStatus } from '../lib/specialFunctions'

class Overall extends PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      data: {
        alarms: []
      },
      percentage: 0,
      status: null
    }
  }

  componentWillReceiveProps(nextProps) {
    // console.log('!this.props.reports', !this.props.reports)
    if (!this.props.reports) return

    // console.log('Different lengths', nextProps.reports.length !== this.props.reports.length)
    if (nextProps.reports.length !== this.props.reports.length) {
      this.setState({
        data: substractReportValues(nextProps.reports)
      }, () => {
        const { status, percentage } = getStatus(this.state.data || null)

        this.setState({
          status,
          percentage
        })
      })
    }
  }

  // getElements(type, props) {
  //   switch (type) {
  //     case 'GENERAL': return props.zone || []
  //     case 'ZONE': return (props.zone && props.zone.subzones) || []
  //     case 'SUBZONE': return (props.subzone && props.subzone.sites) || []
  //     case 'SITE': return (props.element && props.element.sensors) || []
  //     default: return []
  //   }
  // }

  getBackLink({selectedType: type, params}) {
    switch (type) {
      case 'ZONE': return '/sites'
      case 'SUBZONE': return `/sites/${params.zoneId}`
      case 'SITE': return `/sites/${params.zoneId}/${params.subzoneId}`
      default: return '/sites'
    }
  }

  getTitle({siteId, subzoneId, zoneId}, name) {
    if (siteId) {
      return `Sitio ${name}`
    } else if (subzoneId) {
      return `Subzona ${name}`
    } else if (zoneId) {
      return `Zona ${name}`
    }
    return 'Estatus general'
  }

  render() {
    const { state, props } = this
    // Elements (or sensors) to be rendered
    // const elements = this.getElements(props.selectedType, this.props)
    // console.log('GET ELEMENTS', elements)

    return (
      <div className="overall">
        <div className="content">
          <div className="mini-header">
            <span>{props.selectedType !== 'GENERAL' && <Link to={this.getBackLink(props)}>Regresar</Link>}</span>
            {/* <span className="pop-window">Hacer ventana</span> */}
          </div>
          <div className="overall-header">
            <h3>{this.getTitle(props.params, props.element && props.element.name)}</h3>
            <span className="leyend">{state.percentage}%</span>
            <div className="bar-container">
              <div className="normal" style={{width: `${state.percentage}%`, backgroundColor: Constants.colors(state.percentage)}} />
              <div className="alert" style={{width: `${100 - state.percentage}%`}} />
            </div>
          </div>
          <StatusesContainer
            params={props.params}
            type={props.selectedType}
            elements={props.selectedType === 'SITE' ? (props.element ? props.element.sensors : []) : props.elements}
            reports={props.reports}
            onHover={props.onHover}
            element={props.element}
          />
        </div>
      </div>
    )
  }
}

Overall.propTypes = {
  selectedType: PropTypes.string.isRequired,
  reports: PropTypes.array
}

Overall.defaultProps = {
  reports: []
}

export default Overall
