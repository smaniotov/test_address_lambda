const AWS = require("aws-sdk")
// const dynamo = Aws.dynamo()
const fs = require("fs")
const TableName = process.env.TableName

const fillDynamo = (elements, labels, primaryLabel) => new Promise((resolve, reject) => {
    elements.map((element, index) => {
        if (index > 0) {
            const [primaryValue, ...addressElem] = element.split(',')
            const address = addressElem.reduce((out, item, index) => {
                const label = labels[index]
                out[label] = item
                return out
            } , {})
            
            const params = {
                TableName,
                Item: {
                    [primaryLabel]: {S: primaryValue},
                    data: {S: JSON.stringify(address)}
                }
            }
            
            dynamo.putItem(params, (err, data) => {
                if(err) reject(err)
                resolve(data)
            })
        }
    })
})

const init = () => {
    const dataFile = fs.readFileSync(process.argv[2], "utf8")

    const [fileLabels, ...elements] = dataFile.split("\n")
    const [primaryLabel, ...labels] = fileLabels.split(",").map(label => label.replace(' ', '_').toLowerCase())

    const params = {
        TableName: TableName,
        KeySchema: [
            {AttributeName: primaryLabel, KeyType: "HASH"}
        ],
        AttributeDefinitions: labels.map(label => ({AttributeName: label, AttributeType: "S"})),
        ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10
          }
    }

    return new Promise((resolve, reject) => {
        dynamo.createTable(params, (error, data) => {
            if(error) reject(data)    
            return fillDynamo(elements, labels, primaryLabel)
        })
    })
}

init()