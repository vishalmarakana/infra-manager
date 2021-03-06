/* eslint-env node */
const express = require('express')
const path = require('path')
const winston = require('winston')
const router = new express.Router()
const multer = require('multer')
const mime = require('mime')
const mongo = require('mongodb')
const crypto = require('crypto')
const ObjectID = mongo.ObjectID
const mongoose = require('mongoose')

const Zone = require(path.resolve('models/Zone'))
const Site = require(path.resolve('models/Site'))
const Company = require(path.resolve('models/Company'))
const SmartBox = require(path.resolve('models/SmartBox'))

// Storage object specs
const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, 'static/alarms'),
  filename: (req, file, callback) => {
    crypto.pseudoRandomBytes(16, (error, raw) => {
      callback(null, raw.toString('hex') + Date.now() + '.' + mime.getExtension(file.mimetype))
    })
  }
})

const upload = multer({ storage: storage }).fields([
  { name: 'photos', maxCount: 10 },
  { name: 'log', maxCount: 1 }
])

/* ADD PHOTO MEDIA FILES TO THE SPECIFIED ALARM THAT SERVERS AS EVIDENCE */
router
  .route('/sites/alarms')
  .put(upload, (req, res) => {
    const { key, company, alarm } = req.body
    const photoFiles = req.files && req.files.photos
    const photos = []
    if (!key || !company || !photoFiles) return res.status(400).json({ success: false, message: 'Malformed request' })

    // Since it's not human to check which company ObjectId wants to be used, a search based on the name is done
    return Company.findOne({ name: company }).exec((error, company) => {
      if (error) {
        winston.error(error)
        return res.status(500).json({ error })
      }
      if (!company) return res.status(404).json({ success: false, message: 'Specified company was not found' })

      // Find and update site with new information
      photoFiles.map(photo => {
        photos.push('/static/alarms/' + photo.filename)
      })

      return Site.findOne({ company, key }).exec((error, site) => {
        if (error) {
          winston.error({ error })
          return res.status(500).json({ error })
        }
        if (!site) return res.status(404).json({ message: 'No sites found' })
        const alarmIndex = site.alarms.findIndex($0 => $0._id == alarm)
        // Push photo files to specified alarm
        if (alarmIndex !== -1) {
          site.alarms[alarmIndex].photos = photos
          return site.save(error => {
            if (error) {
              winston.error({ error })
              return res.status(500).json({ error })
            }

            return res.status(200).json({
              success: true,
              message: 'Sucessfully pushed photos to the specified alarm'
            })
          })
        }
        return res.status(400).json({
          success: false,
          message: 'Alarm does not exist'
        })
      })
    })
  })

  /* CREATE ALARM (FOR CAMERA USAGE) */
  .post(upload, (req, res) => {
    const { key, company, event, status } = req.body
    const photoFiles = req.files && req.files.photos

    const photos = []
    if (!key || !company || !photoFiles) return res.status(400).json({ success: false, message: 'Malformed request' })

    // Since it's not human to check which company ObjectId wants to be used, a search based on the name is done
    return Company.findOne({ name: company }).exec((error, company) => {
      if (error) {
        winston.error(error)
        return res.status(500).json({ error })
      }
      if (!company) return res.status(404).json({ success: false, message: 'Specified company was not found' })

      // Find and update site with new information
      photoFiles.map(photo => {
        photos.push('/static/alarms/' + photo.filename)
      })

      return Site.findOne({ company, key }).exec((error, site) => {
        if (error) {
          winston.error({ error })
          return res.status(500).json({ error })
        }
        if (!site) return res.status(404).json({ message: 'No sites found' })
        const alarm = {
          timestamp: Date.now(),
          event,
          status,
          risk: 2,
          site: key,
          class: 'camera',
          photos
        }
        site.alarms.push(alarm)
        return site.save(error => {
          if (error) {
            winston.error({ error })
            return res.status(500).json({ error })
          }

          // Emit popup alert socket and add alert to REDUX
          global.io.to(company.name).emit('alert', alarm)

          return res.status(200).json({
            success: true,
            message: 'Successfully created alarm'
          })
        })
      })
    })
  })

// RETRIEVE ALL ONLINE SITES
router.route('/sites/online').get((req, res) => {
  // Get all sites of the specified company
  const company = req._user.cmp
  const online = []

  Site.find({ company })
    .select('key')
    .sort({ key: 1 }) // sort them by key
    .exec((error, sites) => {
      // if there are any errors, return the error
      if (error) {
        winston.error(error)
        return res.status(500).json({ success: false, message: 'Error at finding sites' })
      } else if (sites.length === 0) return res.status(404).json({ success: false, message: 'Sites not found' })

      return sites.forEach((room, index) => {
        global.io.in(room.key).clients((error, clients) => {
          // Just add the rooms who have at least one client
          if (clients.length > 0) online.push(room.key)
          // Return endpoint until all sites have been checked for online status
          if (index === sites.length - 1) return res.status(200).json({ success: true, online })
          return null
        })
      })
    })
})

// UPDATE STATUS OF CONNECTED SITES
router.route('/sites/online').put((req, res) => {
  // Get all sites of the specified company
  const company = req._user.cmp
  const online = []

  Site.find({ company })
    .select('key onlineStatuses')
    .sort({ key: 1 }) // sort them by key
    .exec((error, sites) => {
      // if there are any errors, return the error
      if (error) {
        winston.error(error)
        return res.status(500).json({ success: false, message: 'Error at finding sites' })
      } else if (sites.length === 0) return res.status(404).json({ success: false, message: 'Sites not found' })

      return sites.map((room, index) => {
        global.io.in(room.key).clients((error, clients) => {
          // Just add the rooms who have at least one client
          if (clients.length > 0) {
            online.push(room.key)
            // Remove the oldest online status
            room.onlineStatuses.pop()
            // Insert the online true status
            room.onlineStatuses.unshift(true)
          } else {
            // Remove the oldest online status
            room.onlineStatuses.pop()
            // Insert the online true status
            room.onlineStatuses.unshift(false)
          }

          room.save(error => {
            if (error) {
              console.error(error)
            }
            return null
          })

          // Return endpoint until all sites have been checked for online status
          if (index === sites.length - 1) return res.status(200).json({ success: true, online })
          return null
        })
      })
    })
})

/* CREATE SITE BASED ON A CENTRAL EQUIPMENT (THIS ENDPOINT MUST BE CALLED WHEN A NEW SMARTBOX CONNECTS TO THE SERVER */
router.route('/sites/initialize').post((req, res) => {
  // Since is not human to check which company ObjectId wants to be used, a search based on the name is done
  const { id, version, company, key, name, country, zone } = req.body
  let { position, sensors, cameras } = req.body

  if (
    !id ||
    !version ||
    !company ||
    !key ||
    !name ||
    !position ||
    !sensors ||
    !cameras ||
    !country ||
    !zone
  ) return res.status(400).json({ success: false, message: 'Malformed request' })
  if (typeof sensors === 'string' || typeof cameras === 'string') {
    sensors = JSON.parse(sensors)
    cameras = JSON.parse(cameras)
    position = JSON.parse(position)
  }

  return Company.findOne({ name: company }).exec((error, company) => {
    if (error) {
      winston.error(error)
      return res.status(500).json({ error })
    }
    if (!company) return res.status(404).json({ success: false, message: 'Specified company was not found' })

    // Check if smartbox has been already created
    return new SmartBox({
      id,
      version
    }).save((error, smartbox) => {
      if (error) {
        return res.status(403).json({
          success: false,
          message: 'Smartbox already registered',
          error
        })
      }

      // Always set to zone Centro
      return Zone.findOne({ name: zone, company: company._id }).exec((error, zone) => {
        if (error) {
          winston.error(error)
          return res.status(500).json({ error })
        }

        if (!zone) return res.status(404).json({ success: false, message: 'Specified zone was not found' })
        // Create site using the information in the request body
        return new Site({
          key,
          name,
          position,
          company: company._id,
          sensors,
          cameras,
          smartboxes: smartbox,
          country,
          zone: zone._id
        }).save(error => {
          if (error) {
            winston.error(error)
            return res.status(500).json({
              success: false,
              message: 'Could not create site',
              error
            })
          }
          // Site already registred but smartbox does not. Update the site
          return Site.findOneAndUpdate(
            { key, company: company._id },
            { $push: { smartboxes: smartbox._id } }
          )
            .select('id')
            .exec((error, site) => {
              if (error) {
                winston.error(error)
                return res.status(500).json({
                  success: false,
                  message: 'Could not add the smartbox to the already created site',
                  error
                })
              }
              // Add the new site to the specified subzone
              return res.status(200).json({ site })
            })
        })
      })
    })
  })
})

/* GET A LIST OF ALL SITES REGISTERED TO A SPECFIED COMPANY */
router.route('/sites/list').get((req, res) => {
  const company = req._user.cmp

  Site.find({ company })
    .sort({ _id: 1 })
    .exec((error, sites) => {
      // if there are any errors, return the error
      if (error) {
        winston.error(error)
        return res.status(500).json({ success: 'false', message: 'Error at finding sites' }) // return shit if a server error occurs
      } else if (!sites) return res.status(404).json({ success: 'false', message: 'Sites not found' })
      return res.status(200).json({
        success: true,
        message: 'Successfully retrieved sites',
        sites
      })
    })
})

/* GET A LIST OF REPORTS FOR ALL SITES FROM A SPECIFIED COMPANY */
router.route('/sites/reports').get((req, res) => {
  const { from, to } = req.query
  const company = req._user.cmp

  Site.aggregate(
    [
      { $match: { company: mongoose.Types.ObjectId(company) } },
      {
        $project: {
          alarms: {
            $filter: {
              input: '$alarms',
              as: 'alarm',
              cond: {
                $and: [
                  { $gte: ['$$alarm.timestamp', parseInt(from, 10)] },
                  { $lte: ['$$alarm.timestamp', parseInt(to, 10)] }
                ]
              }
            }
          },
          _id: 0
        }
      }
    ],
    (error, alarms) => {
      Site.find({ company })
        .populate('zone', 'name')
        .select('key zone timestamp sensors history onlineStatuses')
        .exec((error, sites) => {
          if (error) {
            winston.error({ error })
            return res.status(500).json({ error })
          }

          const reports = sites.map((site, index) => ({
            site: {
              _id: site._id,
              key: site.key
            },
            zone: site.zone,
            timestamp: site.timestamp,
            sensors: site.sensors,
            alarms: alarms[index].alarms.map(alarm => ({
              ...alarm,
              site: site.key,
              zone: site.zone
            })),
            history: site.history,
            onlineStatuses: site.onlineStatuses
          }))

          return res.status(200).json({ reports })
        })
    }
  )
})

/* UPDATE SENSORS AND GENERATE ALARMS IF ITS THE CASE. TODO: REFEACTOR THIS ENDPOINT */
router
  .route('/sites/sensors')
  .put((req, res) => {
    let { sensors } = req.body
    const { key, company } = req.body
    if (!key || !company || !sensors) return res.status(400).json({ success: false, message: 'Malformed request' })

    // Parse JSON format from Python
    if (typeof sensors === 'string') sensors = JSON.parse(sensors)

    // Since it's not human to check which company ObjectId wants to be used, a search based on the name is done
    return Company.findOne({ name: company }).exec((error, company) => {
      if (error) {
        winston.error(error)
        return res.status(500).json({ error })
      }
      if (!company) return res.status(404).json({ success: false, message: 'Specified company was not found' })

      // Find and update site with new information
      return Site.findOne({ company, key }).exec((error, site) => {
        if (error) {
          winston.error({ error })
          return res.status(500).json({ error })
        }

        if (!site) return res.status(404).json({ success: false, message: 'No site found' })

        // Generate alarms based on sensors values, always checking if is already alerted or not
        sensors.map((sensor, index) => {
          switch (sensor.class) {
            case 'contact':
              if (sensor.value === 0 && !site.sensors[index].isAlerted) {
                const alarm = {
                  _id: new ObjectID(),
                  timestamp: Date.now(),
                  event: 'Alerta de apertura',
                  status: 'Sensor abierto',
                  risk: 3,
                  site: key,
                  class: sensor.class,
                  key: sensor.key
                }
                site.alarms.push(alarm)
                // Send socket asking for media files
                global.io.to(key).emit('alarm', alarm)
                // Emit popup alert socket and add alert to REDUX
                global.io.to(company.name).emit('alert', alarm)
                // Check site as alerted
                site.sensors[index].isAlerted = true
              } else if (sensor.value === 100) site.sensors[index].isAlerted = false
              break
            case 'vibration':
              if (sensor.value === 0 && !site.sensors[index].isAlerted) {
                const alarm = {
                  _id: new ObjectID(),
                  timestamp: Date.now(),
                  event: 'Alerta de vibración',
                  status: 'Sensor activado',
                  risk: 2,
                  site: key,
                  class: sensor.class,
                  key: sensor.key
                }
                site.alarms.push(alarm)
                // Send socket asking for media files
                global.io.to(key).emit('alarm', alarm)
                // Emit popup alert socket and add alert to REDUX
                global.io.to(company.name).emit('alert', alarm)
                // Check site as alerted
                site.sensors[index].isAlerted = true
              } else if (sensor.value === 100) site.sensors[index].isAlerted = false
              break
            case 'temperature':
              if (sensor.value < 5 && !site.sensors[index].isAlerted) {
                const alarm = {
                  _id: new ObjectID(),
                  timestamp: Date.now(),
                  event: 'Alerta de temperatura',
                  status: 'Temperatura baja',
                  risk: 2,
                  site: key,
                  class: sensor.class,
                  key: sensor.key
                }
                site.alarms.push(alarm)
                // Send socket asking for media files
                global.io.to(key).emit('alarm', alarm)
                // Emit popup alert socket and add alert to REDUX
                global.io.to(company.name).emit('alert', alarm)
                // Check site as alerted
                site.sensors[index].isAlerted = true
              } else if (sensor.value > 40 && !site.sensors[index].isAlerted) {
                const alarm = {
                  _id: new ObjectID(),
                  timestamp: Date.now(),
                  event: 'Alerta de temperatura',
                  status: 'Temperatura alta',
                  risk: 1,
                  site: key,
                  class: sensor.class,
                  key: sensor.key
                }
                site.alarms.push(alarm)
                // Send socket asking for media files
                global.io.to(key).emit('alarm', alarm)
                // Emit popup alert socket and add alert to REDUX
                global.io.to(company.name).emit('alert', alarm)
                // Check site as alerted
                site.sensors[index].isAlerted = true
              } else if (sensor.value > 5 && sensor.value < 50) site.sensors[index].isAlerted = false
              break
            case 'cpu':
              if (sensor.value > 68 && !site.sensors[index].isAlerted) {
                const alarm = {
                  _id: new ObjectID(),
                  timestamp: Date.now(),
                  event: 'Alerta de temperatura del CPU',
                  status: 'Temperatura alta',
                  risk: 2,
                  site: key,
                  class: sensor.class,
                  key: sensor.key
                }
                site.alarms.push(alarm)
                // Emit popup alert socket and add alert to REDUX
                global.io.to(company.name).emit('alert', alarm)
                // Check site as alerted
                site.sensors[index].isAlerted = true
              } else if (sensor.value <= 68) site.sensors[index].isAlerted = false
              break
            case 'battery':
              if (sensor.value <= 15 && !site.sensors[index].isAlerted) {
                const alarm = {
                  _id: new ObjectID(),
                  timestamp: Date.now(),
                  event: 'Alerta de batería',
                  status: 'Bateria baja',
                  risk: 2,
                  site: key,
                  class: sensor.class,
                  key: sensor.key
                }
                site.alarms.push(alarm)
                // Send socket asking for media files
                global.io.to(key).emit('alarm', alarm)
                // Emit popup alert socket and add alert to REDUX
                global.io.to(company.name).emit('alert', alarm)
                // Check site as alerted
                site.sensors[index].isAlerted = true
              } else if (sensor.value > 15) site.sensors[index].isAlerted = false
              break
            default:
          }
          // Update sensors
          const updatedSensor = sensors.find(
            $0 => $0.key === sensor.key && $0.class === sensor.class
          )
          site.sensors[index].value = updatedSensor.value
        })

        return site.save(error => {
          if (error) {
            winston.error({ error })
            return res.status(500).json({ error })
          }

          return res.status(200).json({
            success: true,
            message: 'Updated sensor information sucessfully'
          })
        })
      })
    })
  })

  /* GET A LIST OF ALL SENSORS FOR ALL SITES FROM A SPECIFIED COMPANY */
  .get((req, res) => {
    const company = req._user.cmp

    Site.find({ company })
      .select('sensors key')
      .exec((error, sites) => {
        if (error) {
          winston.error({ error })
          return res.status(500).json({ error })
        }

        if (!sites) return res.status(404).json({ message: 'No sites found' })

        return res.status(200).json({ sites })
      })
  })

// Get sensors of specific type for all company sites
router.route('/sites/sensors/:type').get((req, res) => {
  const company = req._user.cmp

  Site.find({ company })
    .select('key sensors')
    .exec((error, sites) => {
      if (error) {
        winston.error({ error })
        return res.status(500).json({ error })
      }

      if (!sites) return res.status(404).json({ message: 'No sites found' })
      const sensors = []
      sites.map(site => {
        site.sensors.map(sensor => {
          sensors.push(sensor)
        })
      })
      return res.status(200).json({ sensors })
    })
})

router.route('/sites/devices').put((req, res) => {
  let { devices } = req.body
  const { key, company } = req.body
  if (!key || !company || !devices) return res.status(400).json({ success: false, message: 'Malformed request' })

  // Parse JSON format from Python
  if (typeof devices === 'string') devices = JSON.parse(devices)

  // Since it's not human to check which company ObjectId wants to be used, a search based on the name is done
  return Company.findOne({ name: company }).exec((error, company) => {
    if (error) {
      winston.error(error)
      return res.status(500).json({ error })
    }
    if (!company) return res.status(404).json({ success: false, message: 'Specified company was not found' })

    // Find and update site with new information
    return Site.findOne({ company, key })
      .select('devices devices2 devices3')
      .exec((error, site) => {
        if (error) {
          winston.error({ error })
          return res.status(500).json({ error })
        }

        if (!site) return res.status(404).json({ success: false, message: 'No site found' })

        // Update sensors
        if (devices.llave === 2) site.devices2 = devices
        else if (devices.llave === 3) site.devices3 = devices
        else if (devices.llave === 1) site.devices = devices

        return site.save(error => {
          if (error) {
            winston.error({ error })
            return res.status(500).json({ error })
          }

          return res.status(200).json({
            success: true,
            message: 'Updated devices information sucessfully'
          })
        })
      })
  })
})

// Get sensors of specific type for all company sites
router.route('/sites/devices/:type').get((req, res) => {
  const company = req._user.cmp

  Site.find({ company })
    .select('key devices devices2 devices3')
    .exec((error, sites) => {
      if (error) {
        winston.error({ error })
        return res.status(500).json({ error })
      }

      if (!sites) return res.status(404).json({ message: 'No sites found' })
      const devices = []
      const devices2 = []
      const devices3 = []

      sites.map(site => {
        site.devices.map(device => {
          devices.push(device)
        })

        site.devices2.map(device => {
          devices2.push(device)
        })

        site.devices3.map(device => {
          devices3.push(device)
        })
      })
      return res.status(200).json({ devices, devices2, devices3 })
    })
})

module.exports = router
