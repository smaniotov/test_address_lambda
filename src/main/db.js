const AWS = require('aws-sdk')
const dynamo = new AWS.DynamoDB()
const s3 = new AWS.S3()
const fs = require("fs")

const TableName = process.env.TableName
const bucket = process.env.S3_BUCKET

const fillDynamo = (rows, labels, primaryLabel) => new Promise((resolve, reject) => {
  rows.map((element, index) => {
    if (index > 0) {
      const [primaryValue, ...addressElem] = element.split('|')
      const address = addressElem.reduce((out, item, index) => {
        const label = labels[index]
        out[label] = item
        return out
      }, {})

      const params = {
        TableName,
        Item: {
          'code': {
            S: primaryValue
          },
          data: {
            S: JSON.stringify(address)
          }
        }
      }

      dynamo.putItem(params, (err, data) => {
        if (err) reject(err)
        resolve(data)
      })
    }
  })
})

const loadDatabase = (fileKey) => {
  console.log("fleKey", fileKey)

  return new Promise((resolve, reject) => {
    s3.getObject({
      Bucket: bucket,
      Key: fileKey
    }, (err, file) => {
      console.log(file)
      if (err) reject(err)
      const dataFile = file.Body.toLocaleString()

      const [header, ...rows] = dataFile.split('\n')
      const [primaryLabel, ...labels] = header.split('|').map(label => label.replace(' ', '_').toLowerCase())

      resolve(fillDynamo(rows, labels, primaryLabel))
    })
  })
}

const index = (event, context, callback) => {
  const fileKey = event.Records[0].s3.object.key.replace('+', ' ')
  console.log(TableName, bucket)
  console.log(`File ${fileKey} received`)
  console.log(`Event: ${event}`)

  if (fileKey.indexOf('.txt') >= 0) {
    loadDatabase(fileKey)
      .then(() => {
        console.log('Files successfuly sended')
      })
      .catch((error) => {
        console.log(error)
      })
  }
}

exports.handler = index
