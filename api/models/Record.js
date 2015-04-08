/**
 * Record.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {
  tableName: 'record',
  attributes: {
    people_count: {
      type: 'integer'
    },
    actual_count: {
      type: 'integer'
    },
    agenda_id: {
      type: 'string'
    }
  }
};