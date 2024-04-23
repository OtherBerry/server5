import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";
import UAParser from "ua-parser-js";
import useragent from "express-useragent";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg')

var video_to_reroute = 'https://youtu.be/gZ3xR85DPHE';

var user_IP = null; var user_country = null; var user_state = null;
var browser_name = null; var browser_version; var browser_major_version;
var os_name; var os_version; var enginge_name; var engine_version; var bitness;
var device_type; var screen_size; var orientation; var device_pixle_ration;
var platform; var motion_Reduce_pref; var color_scheme_pre; var architecture;
var Datetime; var screenHeight; var screenWidth; var was_redirected;var user_plagin;var campaignid;

var values = {
    user_IP, user_country, user_state, browser_name,
    browser_version, browser_major_version, os_name,
    os_version, enginge_name, engine_version, bitness,
    device_type, screen_size, orientation,
    device_pixle_ration, platform, motion_Reduce_pref,
    color_scheme_pre, architecture, Datetime, screenHeight, screenWidth, was_redirected,
    user_plagin,campaignid
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());
app.use(useragent.express());
app.use((req, res, next) => {
    const hints = ['Sec-CH-Prefers-Reduced-Motion', 'Sec-CH-UA-Bitness', 'Sec-CH-Prefers-Color-Scheme', 'Sec-CH-UA-Arch'];
    res.setHeader('Accept-CH', hints.join(', '));
    next();
});

app.get("/", (req, res) => {
    res.render(__dirname + "/views/v1.ejs");
});


app.get("/v2", (req, res) => {
    res.render(__dirname + "/views/v2.ejs");
});

app.post("/track-user-parameters", (req, res) => {

    //functions that get all user tracking parametes and insert into veriable values.
    getUserIP(req)
    ProcessUA(req)
    processBitness(req)
    processNavigator(req)
    processMotionReducePref(req)
    processColorScheme(req)
    processArch(req)
    processDatetime()
    processPlugins(req)
    getCampaignID(req)

    var full_checl = tests(req)
    if (full_checl === true){
        values.was_redirected = true;

        insertEntryToDB(values);
        console.log('session added to DB')

        var response_data = {'goto': video_to_reroute}
        res.json(response_data);
    } else {
        values.was_redirected = false;

        insertEntryToDB(values);
        console.log('session added to DB')
    }

});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});




function getUserIP(req) {
    const userIP = req.ip;
    console.log("User IP : ", userIP)
}

function ProcessUA(req) {
    const userAgent2 = req.get("user-agent");
    const parser = new UAParser();
    const result = parser.setUA(userAgent2).getResult();


    const useragentJSON = {
        browser: result.browser,
        os: result.os,
        device: { vendor: result.device.vendor || "unknown", model: result.device.model || "unknown", type: result.device.type || "unknown" },
        engine: result.engine,
    };
    console.log('user agent : ', result)

    values.browser_name = result.browser.name || 'unknown';
    values.browser_version = result.browser.version || 'unknown';
    values.browser_major_version = result.browser.major || 'unknown';
    values.os_name = result.os.name || 'unknown';
    values.os_version = result.os.version || 'unknown';
    values.enginge_name = result.engine.name || 'unknown';
    values.engine_version = result.engine.version || 'unknown';
    console.log(useragentJSON);

}


function processBitness(req) {
    values.bitness = req.get("Sec-CH-UA-Bitness");
    console.log("Sec-CH-UA-Bitness:", values.bitness);
}

function processNavigator(req) {
    const { deviceInfo, screenWidth, screenHeight } = req.body;
    values.screenHeight = screenHeight
    values.screenWidth = screenWidth

    console.log('device highet:', screenHeight);
    console.log('device width:', screenWidth);

    values.device_type = deviceInfo.deviceType;
    values.screen_size = deviceInfo.screenSize
    values.orientation = deviceInfo.orientation;
    values.device_pixle_ration = deviceInfo.devicePixelRatio
    values.platform = deviceInfo.platform
    console.log('Received device information:', deviceInfo);
}

function processMotionReducePref(req) {
    values.motion_Reduce_pref = req.get('Sec-CH-Prefers-Reduced-Motion');
    console.log('Sec-CH-Prefers-Reduced-Motion:', values.motion_Reduce_pref);
}
function processColorScheme(req) {
    values.color_scheme_pre = req.get('Sec-CH-Prefers-Color-Scheme');
    console.log('Sec-CH-Prefers-Color-Scheme:', values.color_scheme_pre);
}

function processArch(req) {
    values.architecture = req.get('Sec-CH-UA-Arch');
    console.log('Sec-CH-UA-Arch:', values.architecture);
}
function processDatetime() {
    const currentUTCDate = new Date().toJSON();
    console.log(currentUTCDate)
    values.Datetime = currentUTCDate;
}

function processPlugins(req) {
    const { deviceInfo, screenWidth, screenHeight, pluginList } = req.body;    
    console.log(pluginList)
    values.user_plagin = pluginList;
}

function getCampaignID(req) {
    const { deviceInfo, screenWidth, screenHeight, pluginList,campaignid } = req.body;    
    console.log(campaignid)
    values.campaignid = campaignid;
}

function insertEntryToDB(data) {
    const insertSQL = `
    INSERT INTO user_session (
    user_IP,user_country,user_state,browser_name,browser_version,browser_major_version,os_name,os_version,
    enginge_name,engine_version,bitness,device_type,screen_size,orientation,device_pixle_ration,platform,
    motion_Reduce_pref,color_scheme_pre, architecture,session_datetime,screen_height, screen_width, was_redirected,user_plagin,campaignid
    )
    VALUES ($1 ,$2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20 , $21 , $22 ,$23, $24, $25
        )`;

    pool.query(insertSQL, Object.values(data), (err, result) => {
        if (err) {
            console.error('Error inserting data:', err);
        } else {
            console.log('Data inserted successfully');
        }
    })

}


function tests(req) {
    console.log("------TESTS------")


    // screen size match
    if (values.device_type === 'Desktop' & (values.screenHeight < 1000 & values.screenWidth < 1000)) {
        var device_match = false
    } else {
        var device_match = true
    }
    // console.log('Device Type : ' ,values.device_type)
    console.log('device match : ', device_match)

    // plugin check

    if ((values.os_name.includes("Win") || values.os_name.includes("Android")) & values.browser_name === 'Apple Safari') {
        var browser_match = false;
    } else if (values.os_name.includes("IOS") & values.browser_name === 'Chrome') {
        var browser_match = false;
    } else {
        var browser_match = true;
    }
    console.log('Browser Match : ', browser_match)

    if (device_match === browser_match === true){
        var valid_browser = true;

        console.log('Valid Browser. routing to video...')
    }

    if (valid_browser === true){
        return true;
    } else {
        return false
    }
/*
    // navigator match
    const requested_url = req.url;
    console.log(`requested url: ${requested_url}`);

    // const regex = /http:\/\/localhost:3000\//;
    const regex = /track-user-parameters/;
    const match = regex.test(requested_url);
    console.log(match)

    let navigator_match;

    if (!match) {
        navigator_match = false;
    } else {
        navigator_match = true;
    }
    console.log(navigator_match)
*/



}

