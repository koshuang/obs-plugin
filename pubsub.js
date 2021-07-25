var clientId = '7o941m99epgvrr6c9nfhuyuxqk0fk0';
var redirectURI = 'http://localhost:8080';
var scope = 'user_read+chat:read+bits:read+whispers:read+channel:moderate';
var ws;
let message;


function parseFragment(hash) {
    console.log('parseFragment...');
    var hashMatch = function(expr) {
      var match = hash.match(expr);
      return match ? match[1] : null;
    };
    var state = hashMatch(/state=(\w+)/);
    if (sessionStorage.twitchOAuthState == state)
        sessionStorage.twitchOAuthToken = hashMatch(/access_token=(\w+)/);

    console.log('sessionStorage.twitchOAuthToken...', sessionStorage.twitchOAuthToken);

    return
};

function authUrl() {
    sessionStorage.twitchOAuthState = nonce(15);
    var url = 'https://api.twitch.tv/kraken/oauth2/authorize' +
        '?response_type=token' +
        '&client_id=' + clientId +
        '&redirect_uri=' + redirectURI +
        '&state=' + sessionStorage.twitchOAuthState +
        '&scope=' + scope;
    return url
}

// Source: https://www.thepolyglotdeveloper.com/2015/03/create-a-random-nonce-string-using-javascript/
function nonce(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function heartbeat() {
    message = {
        type: 'PING'
    };
    $('.ws-output').append('SENT: ' + JSON.stringify(message) + '\n');
    ws.send(JSON.stringify(message));
}

function listen(topic) {
    message = {
        type: 'LISTEN',
        nonce: nonce(15),
        data: {
            topics: [topic],
            auth_token: sessionStorage.twitchOAuthToken
        }
    };
    $('.ws-output').append('SENT: ' + JSON.stringify(message) + '\n');
    ws.send(JSON.stringify(message));
}

function connect() {
    console.log('Connect');
    var heartbeatInterval = 1000 * 60; //ms between PING's
    var reconnectInterval = 1000 * 3; //ms to wait before reconnect
    var heartbeatHandle;

    ws = new WebSocket('wss://pubsub-edge.twitch.tv');

    ws.onopen = function(event) {
        $('.ws-output').append('INFO: Socket Opened\n');
        heartbeat();
        heartbeatHandle = setInterval(heartbeat, heartbeatInterval);
    };

    ws.onerror = function(error) {
        $('.ws-output').append('ERR:  ' + JSON.stringify(error) + '\n');
    };

    ws.onmessage = function(event) {
        message = JSON.parse(event.data);
        $('.ws-output').append('RECV: ' + JSON.stringify(message) + '\n');
        if (message.type == 'RECONNECT') {
            $('.ws-output').append('INFO: Reconnecting...\n');
            setTimeout(connect, reconnectInterval);
        }
    };

    ws.onclose = function() {
        $('.ws-output').append('INFO: Socket Closed\n');
        clearInterval(heartbeatHandle);
        $('.ws-output').append('INFO: Reconnecting...\n');
        setTimeout(connect, reconnectInterval);
    };

}

$(function() {
    console.log('Start...');
    if (document.location.hash.match(/access_token=(\w+)/))
        parseFragment(document.location.hash);
    if (sessionStorage.twitchOAuthToken) {
        connect();
        $('.socket').show()
        $.ajax({
            url: "https://api.twitch.tv/helix/users",
            method: "GET",
            headers: {
                "Client-ID": clientId,
                "Authorization": "Bearer " + sessionStorage.twitchOAuthToken
            }})
            .done(function(response) {
                const user = response.data[0];
                $('#topic-label').text("Enter a topic to listen to. For example, to listen to whispers enter topic 'whispers."+user.id+"'");
            });
    } else {
        console.log('Auth...');

        var url = authUrl()

        console.log('url', url);

        $('#auth-link').attr("href", url);
        $('#auth-link-url').text(url);
        $('.auth').show()
    }
});

$('#topic-form').submit(function() {
    listen($('#topic-text').val());
    event.preventDefault();
});
