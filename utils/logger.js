global.lines = []

function collect() {
    return global.lines.join('\n')
}

function line(a,s) {
    console[a](s)
    global.lines.push(s)
}

function log(...message) {
    line('log',"[INFO] " + message.join(''))
}

function warn(...message) {
    line('warn',"[WARN] " + message.join(''))
}

function test(...message) {
    line('warn',"[TEST] " + message.join(''))
}

function okay(...message) {
    line('info',"[OKAY] " + message.join(''))
}

function fail(...message) {
    line('error',"[FAIL] " + message.join(''))
}

module.exports = { log, warn, test, okay, fail }