const express = require("express")
const zip = require('express-zip')
const fs = require('fs')
const bodyParser = require("body-parser")
const wrench = require('wrench')
var rimraf = require("rimraf")
var path = require('path')
var execSync = require('child_process').execSync
const {v4: uuidv4} = require('uuid')
const {symlink} = require("fs")

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
    const uuid = process.env.NODE_ENV === "dev" ? "test" : uuidv4()
    const origGeneratorPath = `${rootPath}/md5-collision-generator/generator`
    const newGeneratorPath = `${rootPath}/md5-collision-generator/generator_${uuid}`
    const md5CollisionGenerator = "make2collExecs.out"
    const sourceCodeTemplate = "SourceCode.cpp.template"
    const sourceExec = "sourceExec"

    copyGenerator(uuid, rootPath, origGeneratorPath, newGeneratorPath, md5CollisionGenerator)
    rewriteOutputTexts(uuid, newGeneratorPath, sourceCodeTemplate, req.body.good_text, req.body.bad_text)
    generateCollisions(uuid, sourceExec, newGeneratorPath, sourceCodeTemplate)
    generateCollidingPrograms(uuid, newGeneratorPath, md5CollisionGenerator, sourceExec)

    respondWithZIP(res, newGeneratorPath)

    removeGeneratedFolder(newGeneratorPath)
})

function copyGenerator(uuid, rootPath, origGeneratorPath, newGeneratorPath, md5CollisionGenerator) {
    console.info(`${uuid}: Copying generator  ...`)
    wrench.copyDirSyncRecursive(origGeneratorPath, newGeneratorPath)
    fs.symlink(`${rootPath}/md5-collision-generator/boostLib`, `${newGeneratorPath}/boostLib`, "dir", (err) => {
        console.error(err)
    })
    fs.chmodSync(`${newGeneratorPath}/${md5CollisionGenerator}`, '777')
    console.info(`${uuid}: Copying generator DONE`)
}

function rewriteOutputTexts(uuid, newGeneratorPath, sourceCodeTemplate, goodText, badText) {
    console.info(`${uuid}: Rewriting output texts  ...`)
    goodText = goodText.replace(";", "") // no C++ code injection
    badText = badText.replace(";", "") // no C++ code injection
    fs.readFile(`${newGeneratorPath}/${sourceCodeTemplate}`, 'utf8', function (err, data) {
        if (err) {
            return console.log(err)
        }
        const result = data
            .replace(/\$good_text_placeholder\$/g, `\"${goodText}\"`)
            .replace(/\$bad_text_placeholder\$/g, `\"${badText}\"`)

        fs.writeFile(`${newGeneratorPath}/${sourceCodeTemplate.replace(".template", "")}`, result, 'utf8', function (err) {
            if (err) return console.log(err)
        })
    })
    console.info(`${uuid}: Rewriting output texts  DONE`)
}

function generateCollisions(uuid, sourceExec, newGeneratorPath, sourceCodeTemplate) {
    console.info(`${uuid}: Generating collisions ...`)
    process.env.NODE_ENV === "dev" ? console.log("NO EXEC! DEV mode enabled!") : execSync(`g++ -o ${sourceExec} ${newGeneratorPath}/${sourceCodeTemplate}`)
    console.info(`${uuid}: Generating collisions DONE`)
}

function generateCollidingPrograms(uuid, newGeneratorPath, md5CollisionGenerator, sourceExec) {
    console.info(`${uuid}: Generating colliding programs ...`)
    process.env.NODE_ENV === "dev" ? console.log("NO EXEC! DEV mode enabled!") : execSync(`cd ${newGeneratorPath} && ./${md5CollisionGenerator} ${sourceExec}`)
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
    process.env.NODE_ENV === "dev"
        ? console.log("NO EXEC! DEV mode enabled!")
        : rimraf(newGeneratorPath, function () {
            console.log(`${newGeneratorPath} removed`)
        })
}