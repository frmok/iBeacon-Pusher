/**
 * TransitionController
 *
 * @description :: Server-side logic for managing transitions
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var mongodb = require('mongodb');
module.exports = {

  /**
   * This method returns the list of transitions
   *
   * @method index
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   */
  index: function(req, res) {
    Transition
      .find()
      .populate('location_id')
      .populate('next_location')
      .exec(function(err, transitions) {
        if (err) {
          res.send(500, {
            error: "FATAL ERROR"
          });
        } else {
          res.send(transitions);
        }
      });
  },

  /**
   * This method returns the list of (non-left) transitions of a particular location
   *
   * @method atLocation
   * @param {Object} req - The request object
   * @param {Integer} req.params.id - The id of location
   * @param {Object} res - The response object
   */
  atLocation: function(req, res) {
    var location_id = req.param("id");
    Transition
      .find({
        location_id: location_id,
        next_location: null
      })
      .exec(function(err, transitions) {
        if (err) {
          res.send(500, {
            error: "FATAL ERROR"
          });
        } else {
          res.send(transitions);
        }
      });
  },

  /**
   * This method returns the transition log of a location
   *
   * @method log
   * @param id {Integer} The id of location
   * @param {Object} req - The request object
   * @param {Integer} req.params.id - The id of location
   * @param {Object} res - The response object
   */
  log: function(req, res) {
    var location_id = req.param("id");
    Transition
      .find({
        location_id: location_id,
        next_location: {
          '!': null
        }
      })
      .populate('location_id')
      .populate('next_location')
      .exec(function(err, transitions) {
        if (err) {
          res.send(500, {
            error: "FATAL ERROR"
          });
        } else {
          var transition_entered = [];
          var transition_left = [];
          var all_transitions = [];
          var moment = require('moment');
          transition_entered = JSON.parse(JSON.stringify(transitions));
          transition_left = JSON.parse(JSON.stringify(transitions));
          for (var i = 0; i < transition_entered.length; i++) {
            transition_entered[i].timestamp = moment(transition_entered[i].createdAt, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
            transition_entered[i].action = "Enter";
            all_transitions.push(transition_entered[i]);
          }
          for (var i = 0; i < transition_left.length; i++) {
            transition_left[i].timestamp = moment(transition_left[i].updatedAt, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
            if (transition_left[i].next_location) {
              if (transition_left[i].location_id.id === transition_left[i].next_location.id) {
                transition_left[i].action = "Leave";
              } else {
                transition_left[i].action = "Go to " + transition_left[i].next_location.name;
              }
              all_transitions.push(transition_left[i]);
            }
          }
          res.send(all_transitions);
        }
      });
  },

  /**
   * This method creates a new transition and returns it
   *
   * @method create
   * @param {Object} req - The request object
   * @param {String} req.body.identifier - The device token
   * @param {Integer} req.body.location_id - The id of location
   * @param {Object} res - The response object
   */
  create: function(req, res) {
    var identifier = req.param("identifier");
    var location_id = req.param("location_id");
    var regexp = new RegExp('<|>| ', 'g');
    identifier = identifier.replace(regexp, '');
    Transition
      .create({
        identifier: identifier,
        location_id: location_id
      })
      .exec(function(err, transition) {
        if (err) {
          res.send(500, {
            error: "FATAL ERROR"
          });
        } else {
          res.send(transition);
        }
      });
  },

  /**
   * This method updates a existing transition and returns it
   *
   * @method update
   * @param {Object} req - The request object
   * @param {Integer} req.body.id - The id of transition
   * @param {String} req.body.next_location - The id of next location
   * @param {Object} res - The response object
   */
  update: function(req, res) {
    var id = req.param("id");
    var next_location = req.param("next_location");
    Transition
      .update({
        id: id
      }, {
        next_location: next_location
      })
      .exec(function(err, transition) {
        if (err) {
          res.send(500, {
            error: "FATAL ERROR"
          });
        } else {
          res.send(transition[0]);
        }
      });
  },

  /**
   * This method marks a transition already left its location
   *
   * @method leave
   * @param {Object} req - The request object
   * @param {Integer} req.body.id - The id of transition
   * @param {Object} res - The response object
   */
  leave: function(req, res) {
    var id = req.param("id");
    Transition.find({
      id: id
    }).exec(function(err, transition) {
      Transition
        .update({
          id: id
        }, {
          next_location: transition[0].location_id
        })
        .exec(function(err, transition) {
          if (err) {
            res.send(500, {
              error: "FATAL ERROR"
            });
          } else {
            res.send(transition[0]);
          }
        });
    });

  },

  /**
   * This method sends a KEEP Poll question to all (non-left) transition of a locaiton
   *
   * @method sendQuestion
   * @param {Object} req - The request object
   * @param {Integer} req.body.msgType - The type of notification
   * @param {String} req.body.msgText - The text of notification
   * @param {String} req.body.msgText - The actual content of notification
   * @param {Integer} req.body.location_id - The id of location
   * @param {Object} res - The response object
   */
  sendQuestion: function(req, res) {
    var msgText = req.param("msgText");
    var msgContent = req.param("msgContent");
    var msgType = parseInt(req.param("msgType"));
    var location_id = req.param("location_id");
    var eventStartDate = req.param("eventStartDate");
    var eventEndDate = req.param("eventEndDate");
    var msgOptions = {
      msgType: msgType,
      msgContent: msgContent,
      msgText: msgText,
      recordId: "",
      eventStartDate: eventStartDate,
      eventEndDate: eventEndDate,
    };
    Transition
      .find({
        location_id: location_id,
        next_location: null
      })
      .exec(function(err, transitions) {
        if (err) {
          res.send(500, {
            debug: "FATAL ERROR"
          });
        } else {
          var identifiers = [];
          for (i = 0; i < transitions.length; i++) {
            identifiers.push(transitions[i].identifier);
          }
          Push.sendMessage(msgOptions, identifiers);
          res.json({
            debug: 'SUCCESS'
          });
        }
      });
  },

  duration: function(req, res) {
    var location_id = req.param("id");
    Transition
      .find({
        location_id: location_id,
        next_location: {
          "!": null,
        }
      })
      .exec(function(err, transitions) {
        if (err) {
          res.send(500, {
            debug: "FATAL ERROR"
          });
        } else {
          var timeDiff = 0;
          var avgTimeDiff = 0;
          transitions.map(function(transition) {
            timeDiff += transition.updatedAt.getTime() - transition.createdAt.getTime();
          });
          avgTimeDiff = timeDiff / transitions.length;
          res.json({
            'duration': parseInt(avgTimeDiff / 1000, 10)
          });
        }
      })
  },

  statDuration: function(req, res) {
    var location_id = req.param("id");
    Transition.native(function(err, collection) {
      collection.aggregate([{
        $match: {
          "location_id": mongodb.ObjectId(location_id),
          "next_location": {
            $exists: true
          }
        }
      }, {
        $sort: {
          "createdAt": 1,
        }
      }, {
        $project: {
          createdAtOffset: {
            $add: ["$createdAt", 8 * 60 * 60 * 1000]
          },
          updatedAtOffset: {
            $add: ["$updatedAt", 8 * 60 * 60 * 1000]
          },
          _id: 0
        }
      }, {
        $group: {
          _id: {
            month: {
              $month: "$createdAtOffset"
            },
            day: {
              $dayOfMonth: "$createdAtOffset"
            },
            year: {
              $year: "$createdAtOffset"
            }
          },
          "count": {
            "$sum": 1
          },
          "avg": {
            $avg: {
              $subtract: ["$updatedAtOffset", "$createdAtOffset"]
            }
          }
        }
      }], function(err, result) {
        var stat = {
          values: [],
          key: 'Duration of stay'
        };
        result.map(function(row) {
          var data = [new Date(row._id.year + '/' + row._id.month + '/' + row._id.day).getTime(), parseInt(row.avg / 1000)];
          stat.values.push(data);
        });
        res.send(stat);
      });

    });
  },

  uniqueVisitorToday: function(req, res) {
    var location_id = req.param("id");
    var today = new Date();
    var todayTimestamp = today.setHours(0, 0, 0, 0);
    Transition.native(function(err, collection) {
      collection.aggregate([{
        $match: {
          "location_id": mongodb.ObjectId(location_id),
          "createdAt": {
            "$gt": new Date(todayTimestamp)
          }
        }
      }, {
        $sort: {
          "createdAt": 1,
        }
      }, {
        $project: {
          createdAtOffset: {
            $add: ["$createdAt", 8 * 60 * 60 * 1000]
          },
          updatedAtOffset: {
            $add: ["$updatedAt", 8 * 60 * 60 * 1000]
          },
          identifier: "$identifier",
          _id: 0
        }
      }, {
        $group: {
          _id: {
            month: {
              $month: "$createdAtOffset"
            },
            day: {
              $dayOfMonth: "$createdAtOffset"
            },
            year: {
              $year: "$createdAtOffset"
            },
            identifier: "$identifier"
          },
          "count": {
            "$sum": 1
          }
        }
      }, {
        $group: {
          _id: {
            month: "$_id.month",
            day: "$_id.day",
            year: "$_id.year",
          },
          "count": {
            "$sum": 1
          }
        }
      }], function(err, result) {
        if (result.length === 0) {
          res.json({
            count: 0
          });
        } else {
          res.json({
            count: result[0].count
          });
        }
      });
    });
  },

  popularPlace: function(req, res) {
    var location_id = req.param("id");
    Transition.native(function(err, collection) {
      collection.aggregate([{
        $match: {
          "location_id": mongodb.ObjectId(location_id),
          "next_location": {
            $exists: true,
            $ne: mongodb.ObjectId(location_id)
          }
        }
      }, {
        $sort: {
          "createdAt": -1,
        }
      }, {
        $group: {
          _id: {
            next_location: "$next_location",
          },
          "count": {
            "$sum": 1
          }
        }
      }, {
        $sort: {
          "count": -1
        }
      }], function(err, result) {
        var all = 0;
        if (result.length === 0) {
          res.send(result);
        }
        for (i in result) {
          (function(result, i) {
            Location
              .find({
                id: String(result[i]._id.next_location)
              }).exec(function(err, location) {
                if (err) {
                  console.log(err);
                }
                all++;
                if(location.length === 0){
                  result[i]._id.next_location = "Undefined";
                }else{
                  result[i]._id.next_location = location[0].name;
                }
                result[i]._id.next_location = location[0].name;
                if (all == result.length) {
                  (function(result) {
                    res.send(result);
                  })(result);
                }
              });
          })(result, i)
        }
      });
    });
  },

  statPeopleCount: function(req, res) {
    var location_id = req.param("id");
    Transition.native(function(err, collection) {
      collection.aggregate([{
        $match: {
          "location_id": mongodb.ObjectId(location_id),
        }
      }, {
        $sort: {
          "createdAt": 1,
        }
      }, {
        $project: {
          createdAtOffset: {
            $add: ["$createdAt", 8 * 60 * 60 * 1000]
          },
          updatedAtOffset: {
            $add: ["$updatedAt", 8 * 60 * 60 * 1000]
          },
          identifier: "$identifier",
          _id: 0
        }
      }, {
        $group: {
          _id: {
            month: {
              $month: "$createdAtOffset"
            },
            day: {
              $dayOfMonth: "$createdAtOffset"
            },
            year: {
              $year: "$createdAtOffset"
            },
            identifier: "$identifier"
          },
          "count": {
            "$sum": 1
          }
        }
      }, {
        $group: {
          _id: {
            month: "$_id.month",
            day: "$_id.day",
            year: "$_id.year",
          },
          "count": {
            "$sum": 1
          }
        }
      }], function(err, result) {
        var stat = {
          values: []
        };
        result.map(function(row) {
          var data = [new Date(row._id.year + '/' + row._id.month + '/' + row._id.day).getTime(), row.count];
          stat.values.push(data);
        });
        res.send(stat);
      });
    });
  },

  /**
   * This method allows client to subscribe to the transition update
   *
   * @method subscribeToTransition
   * @param {Object} req - The request object
   * @param {Object} res - The response object
   */
  subscribeToTransition: function(req, res) {
    var roomName = 'transition';
    sails.sockets.join(req.socket, roomName);
    res.json({
      message: 'Subscribed to a room called ' + roomName
    });
  },
};