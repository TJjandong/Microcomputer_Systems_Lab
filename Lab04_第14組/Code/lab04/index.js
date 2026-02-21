const express = require("express");
const child_process = require("child_process");

const app = express();

app.use(express.static("./public"));
app.use(express.urlencoded({extended: true}));

app.post("/setled", (req, res) => {
	let body = req.body;
	let k = Object.keys(body);
	let led1 = body.led1 ?? "off";
	let led2 = body.led2 ?? "off";
	let led3 = body.led3 ?? "off";
	let led4 = body.led4 ?? "off";
	
	child_process.execFile("sudo", [
		"./c/LED", "LED1", led1
	]);
	child_process.execFile("sudo", [
		"./c/LED", "LED2", led2
	]);
	child_process.execFile("sudo", [
		"./c/LED", "LED3", led3
	]);
	child_process.execFile("sudo", [
		"./c/LED", "LED4", led4
	]);
	
	res.redirect("/");
});

app.post("/setblink", (req, res) => {
	let body = req.body;
	let interval = body.set_interval;
	let num = body.set_count;
	
	child_process.execFile("sudo", [
		"./c/gpio", "blink", num, interval
	]);
	
	res.redirect("/");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=>{
	console.log(`server is running on port ${PORT}`);
});
