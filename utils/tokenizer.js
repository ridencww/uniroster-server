var source = '';
var rules = [];
var tokens = [];

var initOneRosterV1 = function() {
  rules = [];
  rule('whitespace', /^\s+/);
  rule('operator', /^(!=|=|<=|>=|<|>|contains)/i);
  rule('boolean', /^(and|or)/i);
  rule('value', /^'[^\s]+'/);
  rule('field', /^[A-Za-z0-9_\.]+/);
};

var rule = function(tokenType, re) {
  rules.push(function() {
    var result = re.exec(source);
    if (result) {
      var token = {};
      token.type = tokenType;
      token.value = result[0];
      tokens.push(token);
      source = source.substring(result[0].length);
      ret = true;
    }
    return (result);
  });
};

var tokenize = function(expression) {
  tokens = [];

  source = expression;

  while (source) {
    var foundToken = rules.some(function(element, index, array) {
      return element();
    });
    if (!foundToken) {
        console.error("No token matched for '" + source + "'");
        break;
    }
  }

  var endToken = {};
  endToken.type = 'end';
  endToken.value = 'end';
  tokens.push(endToken);

  return tokens;
};

module.exports.initOneRosterV1 = initOneRosterV1;
module.exports.rule = rule;
module.exports.tokenize = tokenize;