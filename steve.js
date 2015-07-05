var raspi = require('raspi-io');
var five = require('johnny-five');

var usonic = require('r-pi-usonic');

var array = require('array-extended');
var temporal = require('temporal');

var started = false;

var board = new five.Board({
    io: new raspi()
});

board.on('ready', function() {

    var sensor = usonic.createSensor(12, 11, 1000);

    var button = new five.Button(29);

    var lMotor = new five.Motor({
        pins: {
            pwm: 'GPIO19',
            dir: 'GPIO5',
            cdir: 'GPIO6'
        }
    });

    var rMotor = new five.Motor({
        pins: {
            pwm: 'GPIO12',
            dir: 'GPIO16',
            cdir: 'GPIO20'
        }
    });

    // Make sure everything is stopped
    lMotor.stop();
    rMotor.stop();

    // These motors are weak, so full speed all the time
    var moveSpeed = 255;

    function stop() {
        console.log('All stop!');
        lMotor.stop();
        rMotor.stop();
    }

    function turn (rightOn, leftOn, timeout) {
        if (rightOn) {
            rMotor.fwd(moveSpeed);
        } else {
            rMotor.rev(moveSpeed);
        }
        if (leftOn) {
            lMotor.fwd(moveSpeed);
        } else {
            lMotor.rev(moveSpeed);
        }
        if (timeout) {
            setTimeout(stop, timeout);
        }
    }

    function turnLeft (timeout) {
        console.log('pivoting left!');
        turn (false, true, timeout);
    }

    function turnRight (timeout) {
        console.log('pivoting right!');
        turn (true, false, timeout);
    }

    function goStraight (timeout) {
        console.log('Full speed ahead captain!');
        turn (true, true, timeout);
    }

    function goBack (timeout) {
        console.log('Iceberg ahead - Full reverse!');
        turn (false, false, timeout);
    }

    var scanSpot = function (cb) {
        setTimeout(function() {
            cb(sensor().toFixed(2));
        }, 100);
    }


    button.on("down", function() {
        started = !started;
        console.log("Button pressed. State changed to started = " + started);

        // scan box
        var minVal = 0;
        var temporalLoop = setInterval(function () {
            var scans = [];
            temporal.queue([
                {
                    delay: 0,
                    task: function () {
                        turnLeft(750);
                        scanSpot(function (val) {
                            scans.push({dir: 'left', val: val})
                            console.log('left: ', val);
                        });
                    }
                },
                {
                    delay: 1500,
                    task: function () {
                        turnRight(750)
                        scanSpot(function (err, val) {
                            scans.push({dir: 'center', val: val})
                            console.log('center: ', val);
                        });
                    }
                },
                {
                    delay: 1500,
                    task: function () {
                        turnRight(750);
                        scanSpot(function (err, val) {
                            scans.push({dir: 'right', val: val})
                            console.log('right: ', val);
                        });
                    }
                },
                {
                    delay: 1500,
                    task: function () {
                        WALL_THRESHOLD = 15;
                        minVal = array.min(scans, 'val').val;
                        var maxVal = array.max(scans, 'val');
                        console.log(maxVal);
                        var direction = maxVal.val > WALL_THRESHOLD ? maxVal.dir : 'right';
                        console.log(direction);
                        if (direction === 'center') {
                            turnLeft(750);
                            goStraight(1500);
                        } else if (direction === 'left') {
                            turnLeft(1500);
                            goStraight(1500);
                        } else {
                            goStraight(1500);
                        }
                    }
                }
            ])
        }, 6000);
    });

});
