const express = require("express")
const zip = require('express-zip')
const bodyParser = require("body-parser")
const path = require('path');
const {v4: uuidv4} = require('uuid')
const {Worker} = require("worker_threads");
const rimraf = require("rimraf");

const app = express()
app.use(bodyParser.urlencoded({extended: true}))

const serverPort = 50080
app.listen(serverPort, function () {
    console.log(`Server started on port ${serverPort}`)
})

const rootPath = __dirname + "/.."

app.get("/", function (req, res) {
    res.sendFile(path.resolve(`${rootPath}/index.html`))
})

app.post("/download", function (req, res) {
    let uuid = uuidv4()
    console.info(`------------ ${uuid} ------------ `)
    let newGeneratorPath = `${rootPath}/md5-collision-generator/generator_${uuid}`
    const worker = new Worker('./generate_collision_and_respond.js', {  // CPU intensive tasks
        workerData: {
            good_text: req.body.good_text,
            bad_text: req.body.bad_text,
            rootPath: rootPath,
            uuid: process.env.NODE_ENV === "dev" ? "test" : uuid,
            origGeneratorPath: `${rootPath}/md5-collision-generator/generator`,
            newGeneratorPath: newGeneratorPath,
            md5CollisionGenerator: "make2collExecs.out",
            sourceCodeTemplate: "SourceCode.cpp.template",
            sourceExec: "sourceExec"
        }
    })
    worker.on('message', (msg) => {
        respondWithZIP(res, uuid, newGeneratorPath)
        removeGeneratedFolder(newGeneratorPath)
        console.log(`${uuid} worker done!`)
    })
    worker.on('error', err => {
        console.error(`${uuid}: ${err}`)
    })
    worker.on('exit', exitCode  => {
        console.error(`${uuid}: worker exit code ${exitCode}`)
    })
})

function respondWithZIP(res, uuid, newGeneratorPath) {
    console.info(`${uuid}: Sending ZIP ...`)
    res.zip([
        {
            path: `${newGeneratorPath}/bad_executable.out`,
            name: 'bad_executable.out'
        },
        {
            path: `${newGeneratorPath}/good_executable.out`,
            name: 'good_executable.out'
        }
    ], "colliding_md5_c++_programs.zip")
    console.info(`${uuid}: Sending ZIP DONE`)
}

function removeGeneratedFolder(newGeneratorPath) {
    process.env.NODE_ENV === "dev"
        ? console.debug(`DEV MODE: Not deleting the ${newGeneratorPath}!`)
        : rimraf(newGeneratorPath, function () {
            console.log(`${newGeneratorPath} removed`)
        })
}