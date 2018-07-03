exports = module.exports = function(callback, app) {
  const workflow = new (require('events').EventEmitter)();

  workflow.outcome = {
    success: false,
    errors: [],
    errfor: {}
  };

  workflow.hasErrors = function() {
    return Object.keys(workflow.outcome.errfor).length !== 0 || workflow.outcome.errors.length !== 0;
  };

  workflow.on('exception', function(err) {
    workflow.outcome.errors.push('Exception: '+ err);
    return workflow.emit('response');
  });

  workflow.on('response', function(result) {
    workflow.outcome.success = !workflow.hasErrors();
    if (workflow.hasErrors()) {
      const error = {
        code: -32603, 
        message: workflow.outcome.errors[0] || 'An internal error has occurred.', 
        data: workflow.outcome
      };
      callback(error);
    } else {
      callback(null, result);
    }
  });

  workflow.on('logError', function(userId, message, err) {
    const newErrorLog = new app.db.models.UserError({
      user: userId,
      error: err,
      message: message || err.message,
      timeStamp: Date.now()
    });
    newErrorLog.save((err, errorLog) => {
      if (err) {
        console.log('error logging error', err);
      } else {
        console.log('error logged!', errorLog);
      }
    });
  });

  return workflow;
};
