var TChannel = require('tchannel');
var _ = require('lodash');
var Ringpop = require('ringpop');
var dns = require('dns');
var async = require('async');

var ClusterNode = function ClusterNode(options){
    // validate options
    console.log('options', options);
    this.socketByHost = options.socketByHost;
    this.name = options.name;
    this.bootstrapNodes = options.bootstrapNodes;
};

function enrich(name, level, method) {
    return function log() {
        var args = [].slice.call(arguments);
        args[0] = name + ' ' + level + ' ' + args[0];
        console[method].apply(console, args);
    };
}

function createLogger(name) {
    return {
        trace: function noop() {},
        debug: enrich(name, 'debug', 'log'),
        info: enrich(name, 'info', 'log'),
        warn: enrich(name, 'warn', 'error'),
        error: enrich(name, 'error', 'error')
    };  
}

ClusterNode.prototype.joinCluster = function joinCluster(done){
    var socketByHost = this.socketByHost;
    var bootstrapNodes = this.bootstrapNodes.reduce(function(c, v){
        c[v] = socketByHost[v];
        return c;
    }, {});

    var bootstrapAddresses = _.values(bootstrapNodes).map(function(host){
        return host.ip + ':' + host.port;
    });

    console.log('socketByHost', socketByHost, 'name', this.name, this);

    var thisNode = socketByHost[this.name];

    console.log('bootstrapNodes', bootstrapNodes);

    console.log('thisNode', thisNode);

    var tchannel = new TChannel();

    var ringpop = new Ringpop({
        app: 'limitd',
        hostPort: thisNode.ip + ':' + thisNode.port,
        channel:  tchannel.makeSubChannel({
            serviceName: 'ringpop',
            trace: false
        }),
        logger: createLogger('limitd-ringpop')
    });

    ringpop.appChannel = tchannel.makeSubChannel({
        serviceName: 'limitd'
    });

    ringpop.setupChannel();

    tchannel.listen(thisNode.port, 
        thisNode.ip, 
        function onListening() {
            console.log('listening', bootstrapAddresses);
            console.log('bootstrapping ringpop');
            ringpop.bootstrap(bootstrapAddresses, done);
        });
};

module.exports = ClusterNode;