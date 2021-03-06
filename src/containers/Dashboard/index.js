import React, { Component } from "react"
import PropTypes from "prop-types"
import { connect } from "react-redux"
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  XAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Area,
  ResponsiveContainer,
  ComposedChart,
  YAxis,
  Bar,
  Line
} from "recharts"

import Card from "components/Card"
import Table from "components/Table"
import RiskBar from "components/RiskBar"
import Tooltip from "components/Tooltip"
import { blue, darkGray } from "lib/colors"
import { getColor, dataChart } from "lib/specialFunctions"
import { NetworkOperation } from "lib"

class Dashboard extends Component {
  constructor(props) {
    super(props)

    this.state = {
      detail: null, // View to general performance (detail)
      worstZone: null, // Worst Zone
      chartCounter: [
        // Array structure for Visual Counter chart
        { name: "7:00 AM", uv: 9, pv: 1042, tv: 92 },
        { name: "8:00 AM", uv: 31, pv: 1042, tv: 34 },
        { name: "9:00 AM", uv: 26, pv: 1043, tv: 93 },
        { name: "10:00 AM", uv: 28, pv: 940, tv: 40 },
        { name: "11:00 AM", uv: 17, pv: 1241, tv: 541 },
        { name: "12:00 PM", uv: 7, pv: 1043, tv: 53 },
        { name: "1:00 PM", uv: 5, pv: 1204, tv: 14 },
        { name: "2:00 PM", uv: 6, pv: 1143, tv: 443 },
        { name: "3:00 PM", uv: 4, pv: 1443, tv: 263 },
        { name: "4:00 PM", uv: 5, pv: 1143, tv: 583 },
        { name: "5:00 PM", uv: 12, pv: 1143, tv: 583 },
        { name: "6:00 PM", uv: 31, pv: 1042, tv: 43 },
        { name: "7:00 PM", uv: 0, pv: 1042, tv: 51 }
      ],
      data: [
        // Array structure for Pie Chart
        { name: "workings", value: 75 },
        { name: "alerts", value: 15 },
        { name: "damaged", value: 10 }
      ],
      selected: 1 // Table selected element
    }

    this.setParentState = this.setParentState.bind(this)
  }

  componentDidMount() {
    const { props } = this
    const alertedZones = []
    const alertedSites = []
    const chart = []

    props.reports.map(site => {
      // Add site onlineStatuses to average service chart
      chart.push(site.onlineStatuses)

      // Most alerted zone
      const zone = alertedZones.find($0 => $0.name === site.zone.name)
      if (zone) {
        zone.value += site.alarms.length
      } else {
        const alertedZone = {
          name: site.zone.name,
          value: site.alarms.length
        }
        alertedZones.push(alertedZone)
      }

      // Most alerted site
      const theSite = alertedSites.find($0 => $0.name === site.site.key)
      if (theSite) {
        theSite.value += site.alarms.length
      } else {
        const alertedSite = {
          name: site.site.key,
          value: site.alarms.length,
          history: site.history,
          alarms: site.alarms
        }
        alertedSites.push(alertedSite)
      }
    })

    // Find the most alerted site
    const worstSite = alertedSites.find(
      $0 => $0.value === Math.max(...alertedSites.map($0 => $0.value))
    )

    // Find the most alerted zone
    const worstZone = alertedZones.find(
      $0 => $0.value === Math.max(...alertedZones.map($0 => $0.value))
    )

    const weeklyAlerts = {
      alarms:
        worstSite &&
        worstSite.alarms.filter(
          $0 =>
            $0.timestamp > Date.now() - 604800000 && $0.timestamp < Date.now()
        ), // 1 week difference
      key: worstSite && worstSite.name
    }

    this.setState({
      worstZone,
      worstSite,
      weeklyAlerts,
      chart
    })

    NetworkOperation.getAvailableSites().then(currentSites => {
      NetworkOperation.getSites().then(allSites => {
        // PIE Chart
        const workings = allSites.data.sites.filter(
          site =>
            currentSites.data.online.includes(site.key) &&
            site.alarms.length === 0
        )

        const damaged = allSites.data.sites.filter(
          site => !currentSites.data.online.includes(site.key)
        )

        const alerted = allSites.data.sites.filter(
          site =>
            site.alarms.length > 0 &&
            currentSites.data.online.includes(site.key)
        )

        const tempData = [
          {
            name: "workings",
            value: workings.length
          },
          {
            name: "alerts",
            value: alerted.length
          },
          {
            name: "damaged",
            value: damaged.length
          }
        ]
        this.setState({
          ok: parseInt(
            (workings.length / allSites.data.sites.length) * 100,
            10
          ),
          bad: parseInt(
            (damaged.length / allSites.data.sites.length) * 100,
            10
          ),
          war: parseInt(
            (alerted.length / allSites.data.sites.length) * 100,
            10
          ),
          sensors: tempData,
          damaged,
          alerted
        })
      })
    })

    setInterval(
      () =>
        NetworkOperation.getAvailableSites().then(currentSites => {
          NetworkOperation.getSites().then(allSites => {
            // PIE Chart
            const workings = allSites.data.sites.filter(
              site =>
                currentSites.data.online.includes(site.key) &&
                site.alarms.length === 0
            )

            const damaged = allSites.data.sites.filter(
              site => !currentSites.data.online.includes(site.key)
            )

            const alerted = allSites.data.sites.filter(
              site =>
                site.alarms.length > 0 &&
                currentSites.data.online.includes(site.key)
            )

            const tempData = [
              {
                name: "workings",
                value: workings.length
              },
              {
                name: "alerts",
                value: alerted.length
              },
              {
                name: "damaged",
                value: damaged.length
              }
            ]

            this.setState({
              ok: parseInt(
                (workings.length / allSites.data.sites.length) * 100,
                10
              ),
              bad: parseInt(
                (damaged.length / allSites.data.sites.length) * 100,
                10
              ),
              war: parseInt(
                (alerted.length / allSites.data.sites.length) * 100,
                10
              ),
              sensors: tempData
            })
          })
        }),
      10000
    )

    // Get Visual Counter information
    NetworkOperation.getCounter().then(({ data }) => {
      const { chartCounter } = this.state
      data.counts.map((count, index) => {
        chartCounter[11].uv = 0
        chartCounter[index].uv = count
        this.setState({
          chartCounter
        })
      })
    })
  }

  setParentState(index) {
    this.setState({
      selected: index
    })
  }

  render() {
    const { state, props } = this
    return (
      <div className="dashboard app-content small-padding">
        <div className="content">
          <h2>
            Estatus <div className="actions" />
          </h2>
          <div className="overall-container">
            <div
              className={`horizontal-container ${
                state.detail !== null ? "minified" : ""
              }`}
            >
              <div className="vertical-container">
                <Card
                  title="Rendimiento general"
                  className={`graph-container`}
                  full={
                    state.detail === "warning" || state.detail === "damaged"
                  }
                  detailView={
                    <div className="detail-view">
                      {state.selected === 0 ? (
                        <h1>
                          {this.state.sensors && this.state.sensors[2].value}
                          <p>
                            /
                            {this.state.sensors &&
                              this.state.sensors[0].value +
                                this.state.sensors[1].value +
                                this.state.sensors[2].value}{" "}
                            equipos offline (<strong>{this.state.bad}%</strong>)
                          </p>
                        </h1>
                      ) : (
                        <h1>
                          {this.state.sensors && this.state.sensors[1].value}
                          <p>
                            /
                            {this.state.sensors &&
                              this.state.sensors[0].value +
                                this.state.sensors[1].value +
                                this.state.sensors[2].value}{" "}
                            equipos alertados (<span>{this.state.war}%</span>)
                          </p>
                        </h1>
                      )}

                      <Table
                        multipleTable
                        selected={state.selected}
                        setState={this.setParentState}
                        element={(item, index, sectionIndex) => (
                          <div
                            className={"table-item"}
                            key={index}
                            onClick={() =>
                              this.onLogSelect(item, index, sectionIndex)
                            }
                          >
                            <div className="medium bold">Centro</div>
                            <div className="medium">{item.key}</div>
                            <div className="medium">{item.name}</div>
                          </div>
                        )}
                        elements={[
                          {
                            title: "Offline",
                            elements: this.state.damaged
                          },
                          {
                            title: "Alertados",
                            elements: this.state.alerted
                          }
                        ]}
                        titles={[
                          { title: "Zona", className: "medium" },
                          { title: "Clave", className: "medium" },
                          { title: "Sitio", className: "medium" }
                        ]}
                      />
                    </div>
                  }
                  detailActions={
                    <p onClick={() => this.setState({ detail: null })}>
                      Cerrar
                    </p>
                  }
                >
                  <div className="graph">
                    <PieChart width={260} height={250}>
                      <Pie
                        animationBegin={0}
                        dataKey="value"
                        data={this.state.sensors}
                        cx={130}
                        cy={125}
                        innerRadius={60}
                        outerRadius={95}
                        strokeWidth={0}
                        label
                      >
                        {this.state.data.map(({ name }, index) => (
                          <Cell key={index} fill={getColor(name)} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        isAnimationActive={false}
                        content={Tooltip}
                      />
                    </PieChart>
                    <h1>{this.state.ok}%</h1>
                  </div>
                  <div>
                    <h3>Equipos funcionando correctamente</h3>
                    <p>
                      {this.state.sensors &&
                        this.state.sensors[0].value +
                          this.state.sensors[1].value}{" "}
                      sitios
                    </p>
                    <div className="stats">
                      <p>
                        <span>{this.state.ok}%</span> funcionando
                      </p>
                      <p
                        className="border button warning"
                        onClick={() =>
                          this.setState({ detail: "warning", selected: 1 })
                        }
                      >
                        <span>{this.state.war}%</span> alertado
                      </p>
                      <p
                        className="border button error"
                        onClick={() =>
                          this.setState({ detail: "damaged", selected: 0 })
                        }
                      >
                        <span>{this.state.bad}%</span> offline
                      </p>
                    </div>
                  </div>
                </Card>
                {this.props.credentials.company.services.map(
                  item =>
                    item === "06" ? (
                      <Card
                        full={false}
                        title="Afluencia de personas"
                        className="horizontal"
                      >
                        <div className="info">
                          <div className="data">
                            <h1>
                              {
                                this.state.chartCounter.reduce(
                                  (fElement, sElement) => ({
                                    uv:
                                      parseInt(fElement.uv, 10) +
                                      parseInt(sElement.uv, 10)
                                  })
                                ).uv
                              }{" "}
                              personas{" "}
                              <span className="delta up">
                                {Math.ceil(
                                  this.state.chartCounter.reduce(
                                    (fElement, sElement) => ({
                                      uv:
                                        parseInt(fElement.uv, 10) +
                                        parseInt(sElement.uv, 10)
                                    })
                                  ).uv /
                                    Math.ceil(
                                      this.state.chartCounter.reduce(
                                        (fElement, sElement) => ({
                                          uv:
                                            parseInt(fElement.uv, 10) +
                                            parseInt(sElement.uv, 10)
                                        })
                                      ).uv / 12
                                    )
                                )}
                                %
                              </span>
                            </h1>
                            <p>
                              Promedio:{" "}
                              {Math.ceil(
                                this.state.chartCounter.reduce(
                                  (fElement, sElement) => ({
                                    uv:
                                      parseInt(fElement.uv, 10) +
                                      parseInt(sElement.uv, 10)
                                  })
                                ).uv / 12
                              )}{" "}
                              personas por hora
                            </p>
                          </div>
                          <ul className="leyend">
                            <li className="car">Personas</li>
                          </ul>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                          <ComposedChart
                            data={this.state.chartCounter}
                            syncId="dashboard"
                            margin={{
                              top: 20,
                              right: 20,
                              bottom: 20,
                              left: 20
                            }}
                          >
                            <XAxis
                              dataKey="name"
                              height={15}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis width={21} tickLine={false} />
                            <RechartsTooltip
                              isAnimationActive={false}
                              content={Tooltip}
                            />
                            <Bar dataKey="uv" fill="rgba(255,255,255,0.15)" />
                            <Line
                              type="linear"
                              dataKey="uv"
                              stroke={blue}
                              strokeWidth={1}
                              activeDot={{ strokeWidth: 0, fill: blue }}
                              dot={{
                                stroke: blue,
                                strokeWidth: 2,
                                fill: darkGray
                              }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </Card>
                    ) : (
                      []
                    )
                )}
              </div>
              {state.detail === null && (
                <div className="vertical-container">
                  <Card
                    className="historical"
                    title="Media de servicio"
                    full={false}
                  >
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart
                        data={dataChart(state.chart)}
                        syncId="dashboard"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <XAxis
                          dataKey="name"
                          height={20}
                          mirror
                          axisLine={false}
                          padding={{ right: 50 }}
                        />
                        <CartesianGrid
                          stroke="#424953"
                          horizontal={false}
                          strokeWidth={0.5}
                        />
                        <defs>
                          <linearGradient
                            id="colorUv"
                            x1="1"
                            y1="0"
                            x2="0"
                            y2="0"
                          >
                            <stop
                              offset="0%"
                              stopColor={blue}
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="100%"
                              stopColor={blue}
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        </defs>
                        <RechartsTooltip
                          isAnimationActive={false}
                          content={Tooltip}
                        />
                        <Area
                          dataKey="pv"
                          fill="url(#colorUv)"
                          animationBegin={0}
                          type="natural"
                          stroke={blue}
                          strokeWidth={2}
                          activeDot={{
                            stroke: blue,
                            strokeWidth: 2,
                            fill: darkGray
                          }}
                        />
                        <ReferenceLine
                          y={40}
                          stroke="red"
                          strokeDasharray="5 5"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                  <div className="horizontal-container">
                    <Card
                      title="Zona de mas alertas"
                      className="horizontal"
                      full={false}
                    >
                      <h1>
                        {this.state.worstZone
                          ? this.state.worstZone.name
                          : "Ninguna"}
                      </h1>

                      <div className="card-footer">
                        <p className="red">
                          {this.state.worstZone
                            ? this.state.worstZone.value
                            : 0}{" "}
                          alertas{" "}
                        </p>
                      </div>
                    </Card>
                    <Card
                      title="Sitio de mas alertas"
                      className="horizontal"
                      full={false}
                    >
                      <h1>
                        {this.state.worstSite
                          ? this.state.worstSite.name
                          : "Ninguno"}
                      </h1>
                      <p>Zona Centro</p>
                      <div className="card-footer">
                        <p className="red">
                          {this.state.worstSite
                            ? this.state.worstSite.alarms.length
                            : 0}{" "}
                          alertas{" "}
                        </p>
                      </div>
                    </Card>
                    <Card
                      title="Top semanal"
                      className="horizontal"
                      full={false}
                    >
                      <h1>
                        {this.state.weeklyAlerts &&
                        this.state.weeklyAlerts.alarms &&
                        this.state.weeklyAlerts.alarms.length > 0
                          ? this.state.weeklyAlerts.key
                          : "Ninguno"}
                      </h1>
                      <p>Zona Centro</p>
                      <div className="card-footer">
                        <p className="red">
                          {this.state.weeklyAlerts &&
                          this.state.weeklyAlerts.alarms
                            ? this.state.weeklyAlerts.alarms.length
                            : 0}{" "}
                          alertas{" "}
                        </p>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>
            <div className="events-container">
              <Table
                multipleTable
                actionsContainer={
                  <div>
                    <p className="button action disabled">Filtrar</p>
                  </div>
                }
                element={(item, index, sectionIndex) => (
                  <div
                    className={`table-item`}
                    key={index}
                    onClick={() => this.onLogSelect(item, index, sectionIndex)}
                  >
                    {item.timestamp && (
                      <div>
                        {new Date(item.timestamp).toLocaleDateString()}{" "}
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                    <div className="medium bold">{item.event}</div>
                    <div className="medium">{item.status}</div>
                    <div>
                      <RiskBar risk={item.risk} />
                    </div>
                    <div>{item.site}</div>
                  </div>
                )}
                elements={[
                  {
                    title: "Alertas",
                    elements: props.alarms
                  },
                  {
                    title: "Historial",
                    elements: props.history
                  }
                ]}
                titles={[
                  { title: "Tiempo" },
                  { title: "Suceso", className: "medium" },
                  { title: "Estatus", className: "medium" },
                  { title: "Riesgo" },
                  { title: "Sitio" }
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }
}

Dashboard.propTypes = {
  credentials: PropTypes.object,
  reports: PropTypes.array,
  alarms: PropTypes.array,
  history: PropTypes.array
}

function mapStateToProps(props) {
  const { reports, credentials, alarms, history } = props
  return {
    reports,
    credentials,
    alarms,
    history
  }
}

export default connect(mapStateToProps)(Dashboard)
