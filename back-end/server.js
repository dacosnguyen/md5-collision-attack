const express = require("express")
const zip = require('express-zip')
const fs = require('fs')
const bodyParser = require("body-parser")
const wrench = require('wrench')
var rimraf = require("rimraf");
var path = require('path')
var execSync = require('child_process').execSync
const {
    v1: uuidv1,
    v4: uuidv4,
} = require('uuid')
const {symlink} = require("fs");

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

var cou
app.post("/download", function (req, res) {
    console.log(req.body)

    var uuid = uuidv4()

    const origGeneratorPath = `${rootPath}/md5-collision-generator/generator`
    const newGeneratorPath = `${rootPath}/md5-collision-generator/generator_${uuid}`
    const md5CollisionGenerator = "make2collExecs.out"
    const sourceCode = "SourceCode.cpp"

    var sourceExec = "sourceExec"
    copyGenerator(uuid, rootPath, origGeneratorPath, newGeneratorPath, md5CollisionGenerator)
    generateCollisions(uuid, sourceExec, newGeneratorPath, sourceCode)
    generateCollidingPrograms(uuid, newGeneratorPath, md5CollisionGenerator, sourceExec)

    respondWithZIP(res, newGeneratorPath)

    removeGeneratedFolder(newGeneratorPath)
})

function copyGenerator(uuid, rootPath, origGeneratorPath, newGeneratorPath, md5CollisionGenerator) {
    console.info(`${uuid}: Copying generator  ...`)
    wrench.copyDirSyncRecursive(origGeneratorPath, newGeneratorPath);
    fs.symlink(`${rootPath}/md5-collision-generator/boostLib`, `${newGeneratorPath}/boostLib`, "dir", (err) => {console.error(err)})
    fs.chmodSync(`${newGeneratorPath}/${md5CollisionGenerator}`, '777')
    console.info(`${uuid}: Copying generator DONE`)
}

function generateCollisions(uuid, sourceExec, newGeneratorPath, sourceCode) {
    console.info(`${uuid}: Generating collisions ...`)
    execSync(`g++ -o ${sourceExec} ${newGeneratorPath}/${sourceCode}`)
    console.info(`${uuid}: Generating collisions DONE`)
}

function generateCollidingPrograms(uuid, newGeneratorPath, md5CollisionGenerator, sourceExec) {
    console.info(`${uuid}: Generating colliding programs ...`)
    execSync(`cd ${newGeneratorPath} && ./${md5CollisionGenerator} ${sourceExec}`)
    console.info(`${uuid}: Generating colliding programs DONE`)
}

function respondWithZIP(res, newGeneratorPath) {
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
}

function removeGeneratedFolder(newGeneratorPath) {
    rimraf(newGeneratorPath, function () { console.log(`${newGeneratorPath} removed`); });
}