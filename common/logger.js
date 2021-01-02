const { Logger, createLogStream } = require('aws-cloudwatch-log')
 
var dateTime = new Date()
var streamName = process.env.LOG_STREAM + `-${dateTime.getMonth()+1}-${dateTime.getDate()+1}-${Math.random().toString(16).substr(2, 4)}`
 
const config = { 
    logGroupName: process.env.LOG_GROUP, 
    logStreamName: streamName, 
    region: 'us-east-1', 
    accessKeyId: process.env.AWS_KEY_ID, 
    secretAccessKey: process.env.AWS_KEY_SECRET, 
    uploadFreq: 10000, 	// Optional. Send logs to AWS LogStream in batches after 10 seconds intervals.
    local: false 		// Optional. If set to true, the log will fall back to the standard 'console.log'.
}

createLogStream(streamName, config)

const logger = new Logger(config)
export default logger