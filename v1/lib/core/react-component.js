const React = require('react');
const babel = require("@babel/core");

const returnLastExpressionPlugin = ({ types: t }) => ({
  visitor: {
    // We only care about top-level expressions
    Program(path) {
      // Find the last expression statement
      let lastExpr;
      for (let i = path.node.body.length - 1; i >= 0; i--) {
        if (t.isExpressionStatement(path.node.body[i])) {
          lastExpr = path.get(`body.${i}`);
          break;
        }
      }

      if (lastExpr) {
        // ... and turn it into a return statement
        lastExpr.replaceWith(t.returnStatement(lastExpr.node.expression));
      }
    }
  }
});

const renderReact = (components) => {
  const keys = Object.keys(components);
  const values = Object.values(components);
  return ({ children }) => {
    const { code } = babel.transformSync(children, {
      compact: true,
      plugins: [returnLastExpressionPlugin],
      presets: ['@babel/env', '@babel/react']
    });
    // eslint-disable-next-line
    return new Function("React", ...keys, code)(React, ...values);
  }
};

module.exports = renderReact;
