
var mosca = require('mosca');

var savePublishData = require('./savePublishData');    //lwt.js


var settings = {
    port: 1885,
    http: {
        port: 3335,
        bundle: true,
        static: './'
    }
    // backend: ascoltatore
};

const sql = require('mssql');

// config for your database
const config = {
    user: 'sa',
    password: '123',
    server: 'localhost\\VSQL', // You can use 'localhost\\instance' to connect to named instance
    database: 'iot',

    options: {
        encrypt: true // Use this if you're on Windows Azure
    }
}

const poolConnected = new sql.ConnectionPool(config);
const poolData = new sql.ConnectionPool(config);
const poolClient = new sql.ConnectionPool(config);
const poolConfig = new sql.ConnectionPool(config);

var authenticate = function (client, username, password, callback) {
    if (username == "esp32" && password.toString() == "mtt@23377")
        callback(null, true);
    else
        callback(null, false);
}

var authorizePublish = function (client, topic, payload, callback) {
    var auth = true;
    // set auth to :
    //  true to allow 
    //  false to deny and disconnect
    //  'ignore' to puback but not publish msg.
    callback(null, auth);
}

var authorizeSubscribe = function (client, topic, callback) {
    var auth = true;
    // set auth to :
    //  true to allow
    //  false to deny 
    callback(null, auth);
}

// here we start mosca
var broker = new mosca.Server(settings);

broker.on('ready', setup);

// fired when the mqtt broker is ready
function setup() {
    broker.authenticate = authenticate;
    broker.authorizePublish = authorizePublish;
    broker.authorizeSubscribe = authorizeSubscribe;


    console.log('Mosca broker is up and running')
}

// fired whena  client is connected
// add "clientId", "clientStatus"
broker.on('clientConnected', function (client) {
    console.log('Client connected: ', client.id);
    console.log('----------------');
    var now = Date();
    poolConnected.connect(err => {
        // ...
        
        poolConnected.request().query(`insert into CLIENT (ClientId) 
            values (\'${client.id}\')`, (err, result) => {
                // ... error checks
                console.log('----------------');
                // console.dir(result)
                console.dir(result);
                // console.dir(result.recordset[0].Value1);
            })
    })


});

// fired when a message is received
broker.on('published', function (packet, client) {

    var stringPayload = packet.payload.toString('utf-8');
    var stringTopic = packet.topic.toString('utf-8');
    var objPayload = stringPayload;

    try {
        //Nếu Payload là chuối JSON thì convert to Object
        objPayload = JSON.parse(stringPayload);
    } catch (err) {
        //Xuất lỗi nếu Payload ko phải là chuổi JSON
        console.log(err.message);
    }
    console.log('Published data: ', objPayload);
    // console.log('Published data: ', client.id);        
    console.log('--------------- ');

    if (objPayload.value1!=undefined && client.id!=undefined) {
        console.log('--------------- ');
        console.log('Client published: ', client.id);
        poolData.connect(err => {
            // ...
            
            poolData.request().query(`insert into CURRENT_DATA (ClientId, Value1, Value2, Value3, Topic) 
            values (\'${client.id}\', \'${objPayload.value1}\', \'${objPayload.value2}\', \'${objPayload.value3}\', \'${packet.topic}\')`, (err, result) => {
                // ... error checks

                // console.dir(result)
                console.dir(result);
                // console.dir(result.recordset[0].Value1);
            })
        })
    } else if (objPayload.type != undefined) {
        console.log('--------------- ');
        console.log('--------------- ');

        poolClient.connect(err=> {
            poolClient.request().query(`UPDATE CLIENT
            SET Location = \'${objPayload.location}\'
                ,Type = \'${objPayload.type}\'
                ,Name = \'${objPayload.name}\'
                ,Mac = \'${objPayload.mac}\'
                ,Server = \'${objPayload.server}\'
                ,Port = \'${objPayload.port}\'
                ,Version = \'${objPayload.version}\'
                ,UpdateFile = \'${objPayload.updateFile}\'
            WHERE ClientId = \'${client.id}\'`, (err, result) => {
                    // ... error checks

                    // console.dir(result)
                    console.dir(result);
                    // console.dir(result.recordset[0].Value1);
            })
        }) 
        //add "current" app
        if (objPayload.type === "current") {        
            console.log('current--------------- ');
            poolConfig.connect(err => {
                poolConfig.request().query(`insert into CURRENT_CONFIG (ClientId, Calib, TI, AdcZero, AdcPin) 
                values (\'${client.id}\'
                    , \'${objPayload.config.calib}\'
                    , \'${objPayload.config.TI}\'
                    , \'${objPayload.config.adcZero}\'
                    , \'${objPayload.config.adcPin}\')`, (err, result) => {
                        // ... error checks

                        // console.dir(result)
                        console.dir(result);
                        // console.dir(result.recordset[0].Value1);
                })
            })
        }
        //add other app
        else if (objPayload.type === "huan") {  

        }
    }
    
});

// fired when a client subscribes to a topic
broker.on('subscribed', function (topic, client) {
    console.log('subscribed topic: ', topic);
    console.log('----------------:');
    
});


// fired when a client subscribes to a topic
broker.on('unsubscribed', function (topic, client) {
    var data = "off";
    console.log('unsubscribed topic: ', topic);
    console.log('------------------- ');
    
});

// fired when a client is disconnecting
broker.on('clientDisconnecting', function (client) {
    console.log('clientDisconnecting : ', client.id);
});

/* 
fired when a client is disconnected
add "status: disconnected" into collection: clientInfo
*/
broker.on('clientDisconnected', function (client) {
    console.log('clientDisconnected id: ', client.id);
    console.log('------------------- ');
    
});


Date.prototype.vnDate = function () {
    var yyyy = this.getFullYear();
    var mm = this.getMonth() + 1;
    var dd = this.getDate();

    // var hours = this.getHours();
    // var minutes = this.getMinutes();
    // var seconds = this.getSeconds();

    // return dd + "/" + mm + "/" + yyyy + " " + hours + ":" + minutes + ":" + seconds;
    return mm + "/" + dd + "/" + yyyy; // + " " + hours + ":" + minutes + ":" + seconds;
}

// smodule.exports = server;	// export - dử dụng để gọi 'app.js' trong file './bin/www'
