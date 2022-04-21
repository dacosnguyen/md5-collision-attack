const wrench = require("wrench");
const fs = require("fs");
const {execSync} = require("child_process");
const {parentPort, workerData} = require("worker_threads");

processReq(workerData.good_text, workerData.bad_text, workerData.rootPath, workerData.uuid, workerData.origGeneratorPath, workerData.newGeneratorPath, workerData.md5CollisionGenerator, workerData.sourceCodeTemplate, workerData.sourceExec)

function processReq(good_text, bad_text, rootPath, uuid, origGeneratorPath, newGeneratorPath, md5CollisionGenerator, sourceCodeTemplate, sourceExec) {
    console.time(`${uuid} worker`)
    copyGenerator(uuid, rootPath, origGeneratorPath, newGeneratorPath, md5CollisionGenerator)
    rewriteOutputTexts(uuid, newGeneratorPath, sourceCodeTemplate, good_text, bad_text)
    generateCollisions(uuid, sourceExec, newGeneratorPath, sourceCodeTemplate)
    generateCollidingPrograms(uuid, newGeneratorPath, md5CollisionGenerator, sourceExec)
    console.timeEnd(`${uuid} worker`)
    parentPort.postMessage(`${uuid} done`);
}

function copyGenerator(uuid, rootPath, origGeneratorPath, newGeneratorPath, md5CollisionGenerator) {
    console.info(`${uuid}: Copying generator  ...`)
    wrench.copyDirSyncRecursive(origGeneratorPath, newGeneratorPath)
    fs.symlink(`${rootPath}/md5-collision-generator/boostLib`, `${newGeneratorPath}/boostLib`, "dir", (err) => {
        if (err) {
            console.error(err)
        }
    })
    fs.chmodSync(`${newGeneratorPath}/${md5CollisionGenerator}`, '777')
    console.info(`${uuid}: Copying generator DONE`)
}

function rewriteOutputTexts(uuid, newGeneratorPath, sourceCodeTemplate, goodText, badText) {
    console.info(`${uuid}: Rewriting output texts  ...`)
    goodText = goodText.replace(";", "") // no C++ code injection
    badText = badText.replace(";", "") // no C++ code injection
    let fileContent = fs.readFileSync(`${newGeneratorPath}/${sourceCodeTemplate}`, 'utf8')
    const result = fileContent
        .replace(/\$good_text_placeholder\$/g, `\"${goodText}\"`)
        .replace(/\$bad_text_placeholder\$/g, `\"${badText}\"`)
    fs.writeFileSync(`${newGeneratorPath}/${sourceCodeTemplate.replace(".template", "")}`, result, 'utf8')
    console.info(`${uuid}: Rewriting output texts  DONE`)
}

function generateCollisions(uuid, sourceExec, newGeneratorPath, sourceCodeTemplate) {
    console.info(`${uuid}: Generating collisions ...`)
    if (process.env.NODE_ENV === "dev") {
        console.debug("DEV MODE: Not generating collisions! Sleeping instead ...")
        execSync('sleep 4')
    } else {
        execSync(`g++ -o ${sourceExec} ${newGeneratorPath}/${sourceCodeTemplate}`)
    }
    console.info(`${uuid}: Generating collisions DONE`)
}

function generateCollidingPrograms(uuid, newGeneratorPath, md5CollisionGenerator, sourceExec) {
    console.info(`${uuid}: Generating colliding programs ...`)
    process.env.NODE_ENV === "dev" ? console.debug("DEV MODE: Not generating colliding C++ programs!") : execSync(`cd ${newGeneratorPath} && ./${md5CollisionGenerator} ${sourceExec}`)
    console.info(`${uuid}: Generating colliding programs DONE`)
}
