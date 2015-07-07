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

    var sensor = usonic.createSensor(18, 17, 450);

    var button = new five.Button(29);
    var resetButton = new five.Button(25);

    var lMotor = new five.Motor({
        pins: {
            pwm: 'GPIO19',
            dir: 'GPIO6',
            cdir: 'GPIO5'
        }
    });

    var rMotor = new five.Motor({
        pins: {
            pwm: 'GPIO12',
            dir: 'GPIO20',
            cdir: 'GPIO16'
        }
    });

    // Make sure everything is stopped
    lMotor.stop();
    rMotor.stop();

    // These motors are weak, so full speed all the time
    var moveSpeed = 255;

    function stop() {
//        console.log('All stop!');
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
//        console.log('pivoting left!');
        turn (false, true, timeout);
    }

    function turnRight (timeout) {
//        console.log('pivoting right!');
        turn (true, false, timeout);
    }

    function goStraight (timeout) {
//        console.log('Full speed ahead captain!');
        turn (true, true, timeout);
    }

    function goBack (timeout) {
//        console.log('Iceberg ahead - Full reverse!');
        turn (false, false, timeout);
    }

    var scanSpot = function (cb) {
        setTimeout(function() {
            cb(sensor().toFixed(2));
        }, 100);
    }

    button.on("up", function() {
        started = !started;
        console.log("Button pressed. State changed to started = " + started);
/*
        this.loop(1000, function() {
            // Don't go closer than 20 cm to a wall
            var WALL_THRESHOLD = 20;
            // Check our distance from the wall
            var scan;
            scanSpot(function (val) {
                scan = val
                console.log('distance: ', val);
            });
            // go straight if no obstacle
            if (scan > WALL_THRESHOLD) {
                goStraight(800);
            // Otherwise, turn left and try again
            } else {
                turnLeft(400);
            }
        });
*/
        var minVal = 0;
        var temporalLoop = setInterval(function () {

            resetButton.on("up", function() {
                started = false;
//                console.log("Reset button pressed.");
                clearInterval(temporalLoop)
                stop();
            });

            var scans = [];
            temporal.queue([
                {
                    delay: 100,
                    task: function () {
                        scanSpot(function (val) {
                            scans.push({dir: 'center', val: val})
                            console.log('center: ', val);
                        });
                    }
                },
                {
                    delay: 200,
                    task: function () {
                        console.log(array);
                        var WALL_THRESHOLD = 20;
                        minVal = array.min(scans, 'val').val;
                        var maxVal = array.max(scans, 'val');
                        console.log(maxVal);
                        var direction = maxVal.val > WALL_THRESHOLD ? maxVal.dir : 'left';
                        console.log(direction);
                        if (direction === 'center') {
                            turnLeft(400);
                        } else {
                            goStraight(800);
                        }
                    }
                }
            ])
        }, 1400);
    });

});
