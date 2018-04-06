(function() {
	var calculateRadianAngle = function(cx, cy, ex, ey) {
	  var dy = ey - cy;
	  var dx = ex - cx;
	  var theta = Math.atan2(dy, dx); // range (-PI, PI]
	  // theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
	  // if (theta < 0) theta = 360 + theta; // range [0, 360)

	  return theta;
	}

	var getSelfPos = function() {
		if(game.activePlayer) {
			return game.activePlayer.pos
		} else {
			return false;
		}
	}

	var detectEnemies = function() {
		var result = [];
		if(!game.playerBarn.playerInfo[game.activeId]) return result;

		var selfTeamId = game.playerBarn.playerInfo[game.activeId].teamId;
		var selfId = game.activeId;
		var objectIds = Object.keys(game.objectCreator.idToObj);
		var playerIds = Object.keys(game.playerBarn.playerInfo);

		for(var i = 0; i < playerIds.length; i++) {
			if( game.objectCreator.idToObj[playerIds[i]] && 
				(!game.objectCreator.idToObj[playerIds[i]].netData.dead) && 
				(!game.objectCreator.idToObj[playerIds[i]].netData.downed) &&
				game.playerBarn.playerInfo[playerIds[i]].teamId != selfTeamId) {
				if(playerIds[i] != selfId) {
					result[playerIds[i]] = game.objectCreator.idToObj[playerIds[i]];
				}
			}
		}

		return result;
	}

	var getMinimalDistanceIndex = function(enemyDistances) {
		return enemyDistances.indexOf(Math.min.apply(null, enemyDistances));
	}

	var state = {
		playerId: 0,
		distance: Infinity,
		radianAngle: 0,
		prevRadianAngle: 0,
		new: false,
		timestamp: Date.now(),
	}
	var captureEnemyMode = false;
	var updateState = function(detectedEnemies) {
		var selfPos = getSelfPos();
		var enemyDistances = [];
		var enemyRadianAngles = [];
		var detectedEnemiesKeys = Object.keys(detectedEnemies);

		if(!detectedEnemiesKeys.length) {
			state.new = false;
			state.timestamp = Date.now();	
			return;
		} else {
			if(captureEnemyMode) {
				if(detectedEnemies[state.playerId]) {
					var enemyPos = detectedEnemies[state.playerId].netData.pos;

					var distance = Math.sqrt(Math.pow(Math.abs(selfPos.x - enemyPos.x), 2) + Math.pow(Math.abs(selfPos.y - enemyPos.y), 2));
					var radianAngle = calculateRadianAngle(selfPos.x, selfPos.y, enemyPos.x, enemyPos.y);

					state.distance = Math.sqrt(Math.pow(Math.abs(selfPos.x - enemyPos.x), 2) + Math.pow(Math.abs(selfPos.y - enemyPos.y), 2));
					state.prevRadianAngle = state.radianAngle;
					state.radianAngle = calculateRadianAngle(selfPos.x, selfPos.y, enemyPos.x, enemyPos.y);
					state.new = true;
					state.timestamp = Date.now();

					return;
				}
			}

			for(var i = 0; i < detectedEnemiesKeys.length; i++) {
				var enemyPos = detectedEnemies[detectedEnemiesKeys[i]].netData.pos;

				var distance = Math.sqrt(Math.pow(Math.abs(selfPos.x - enemyPos.x), 2) + Math.pow(Math.abs(selfPos.y - enemyPos.y), 2));
				var radianAngle = calculateRadianAngle(selfPos.x, selfPos.y, enemyPos.x, enemyPos.y);

				enemyDistances.push(distance);
				enemyRadianAngles.push(radianAngle);	
			}

			var minimalDistanceEnemyIndex = getMinimalDistanceIndex(enemyDistances);
			if(state.playerId != detectedEnemies[detectedEnemiesKeys[minimalDistanceEnemyIndex]].__id) {
				state = {
					playerId: detectedEnemies[detectedEnemiesKeys[minimalDistanceEnemyIndex]].__id,
					distance: enemyDistances[minimalDistanceEnemyIndex],
					radianAngle: enemyRadianAngles[minimalDistanceEnemyIndex],
					prevRadianAngle: enemyRadianAngles[minimalDistanceEnemyIndex],
					new: true,
					timestamp: Date.now(),
				}
			} else {
				state.distance = enemyDistances[minimalDistanceEnemyIndex];
				state.prevRadianAngle = state.radianAngle;
				state.radianAngle = enemyRadianAngles[minimalDistanceEnemyIndex];
				state.new = true;
				state.timestamp = Date.now();
			}
		}
	}

	// More shaken for more values
	var forecastCoeff = 20;
	var iterate = function() {
		// check if we in game
		if(!game.playing) return;
		
		updateState(detectEnemies());
		
		if(state.new) {
			var halfScreenWidth = game.camera.screenWidth/2;
			var halfScreenHeight = game.camera.screenHeight/2;

			var minScreenCircleRadius = halfScreenHeight > halfScreenWidth ? halfScreenWidth : halfScreenHeight;
			minScreenCircleRadius = Math.floor(minScreenCircleRadius - 1);

			var targetMousePosition = {};
			targetMousePosition.x = halfScreenWidth + minScreenCircleRadius * Math.cos(state.radianAngle + state.distance/100 * forecastCoeff * (state.radianAngle - state.prevRadianAngle));
			targetMousePosition.y = halfScreenHeight - minScreenCircleRadius * Math.sin(state.radianAngle + state.distance/100 * forecastCoeff * (state.radianAngle - state.prevRadianAngle));

			if(targetMousePosition.x && targetMousePosition.y) {
				game.input.mousePos = {
					x: targetMousePosition.x,
					y: targetMousePosition.y,
				}
			}
		}

		if( !game.activePlayer.localData.inventory["4xscope"] &&
			!game.activePlayer.localData.inventory["8xscope"] &&
			!game.activePlayer.localData.inventory["15xscope"]) {

			game.activePlayer.localData.curScope = "4xscope"; //15xscope
			game.activePlayer.localData.inventory["4xscope"] = 1;	
		}
	}

	var addSpaceKeyListener = function() {
		document.addEventListener("keydown", function(event) {
			if(event.which == 32) {
				game.input.mouseButton = true;
			}
		});

		document.addEventListener("keyup", function(event) {
			if(event.which == 32) {
				game.input.mouseButton = false;
			}
		});
	}

	var removeSpaceKeyListener = function() {
		document.removeEventListener("keydown", function(event) {
			if(event.which == 32) {
				game.input.mouseButton = true;
			}
		});

		document.removeEventListener("keyup", function(event) {
			if(event.which == 32) {
				game.input.mouseButton = false;
			}
		});
	}

	var timer = null;
	function ticker() {
		iterate();
		timer = setTimeout(ticker, 10);
	}

	function reload() {
		removeSpaceKeyListener();
		addSpaceKeyListener();

		if(timer) clearTimeout(timer);
		ticker();
	}

	function stop() {
		removeSpaceKeyListener();
		if(timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	var scriptEnabled = false;
	var addZKeyListener = function() {
		document.addEventListener("keyup", function(event) {
			if(event.which == 90) {
				scriptEnabled = !scriptEnabled;
				if(scriptEnabled) {
					reload();
				} else {
					stop();
				}
			}
		});
	}

	var removeZKeyListener = function() {
		document.removeEventListener("keyup", function(event) {
			if(event.which == 90) {
				scriptEnabled = !scriptEnabled;
				if(scriptEnabled) {
					reload();
				} else {
					stop();
				}
			}
		});
	}

	var addOKeyListener = function() {
		document.addEventListener("keyup", function(event) {
			if(event.which == 79) {
				captureEnemyMode = !captureEnemyMode;
			}
		});
	}

	var removeOKeyListener = function() {
		document.removeEventListener("keyup", function(event) {
			if(event.which == 79) {
				captureEnemyMode = !captureEnemyMode;
			}
		});
	}

	removeZKeyListener();
	addZKeyListener();

	removeOKeyListener();
	addOKeyListener();
})();