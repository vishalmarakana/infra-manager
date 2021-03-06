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
      status: null,
      isHidden: false
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (!this.props.reports) return
    if (nextProps.reports.length === this.props.reports.length && this.props.reports.length > 1) {
      this.setState(
        {
          data: substractReportValues(nextProps.reports)
        },
        () => {
          const { status, percentage } = getStatus(this.state.data || null)
          this.setState({
            status,
            percentage
          })
        }
      )
    }
  }

  getBackLink({ selectedType: type, params }) {
    switch (type) {
      case 'ZONE':
        return '/sites'
      case 'SITE':
        return `/sites/${params.zoneId}`
      default:
        return '/sites'
    }
  }

  getTitle({ siteId, zoneId }, name) {
    if (siteId) {
      return `Sitio ${name}`
    } else if (zoneId) {
      return `Zona ${name}`
    }
    return 'Estatus General'
  }

  render() {
    const { state, props } = this
    let elements = []

    if (props.selectedType === 'SITE') {
      if (props.element) elements = props.element.sensors
    } else elements = props.elements

    return (
      <div className={`overall ${state.isHidden || props.isCreating ? 'hidden' : ''}`}>
        <div
          className="tooltip"
          onClick={() => this.setState(prev => ({ isHidden: !prev.isHidden }))}
        />
        <div className="content">
          <div className="mini-header">
            <span>
              {props.selectedType !== 'GENERAL' && (
                <Link to={this.getBackLink(props)}>Regresar</Link>
              )}
            </span>
            {/* <span className="pop-window">Hacer ventana</span> */}
          </div>
          <div className="overall-header">
            <h3>{this.getTitle(props.params, props.element && props.element.name)}</h3>
            <span className="leyend">{state.percentage}%</span>
            <div className="bar-container">
              <div
                className="normal"
                style={{
                  width: `${state.percentage}%`,
                  backgroundColor: Constants.colors(state.percentage)
                }}
              />
              <div className="alert" style={{ width: `${100 - state.percentage}%` }} />
            </div>
          </div>
          <StatusesContainer
            params={props.params}
            type={props.selectedType}
            elements={elements}
            reports={props.reports}
            onHover={props.onHover}
            element={props.element}
            photo1={null}
            photo2={null}
          />
        </div>
      </div>
    )
  }
}

Overall.propTypes = {
  selectedType: PropTypes.string.isRequired,
  element: PropTypes.object,
  reports: PropTypes.array
}

Overall.defaultProps = {
  reports: []
}

export default Overall
