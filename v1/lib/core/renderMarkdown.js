/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */


const hljs = require('highlight.js');
const Markdown = require('remarkable');
const ReactRenderer = require('remarkable-react').default;
const prismjs = require('prismjs');
const deepmerge = require('deepmerge');
const chalk = require('chalk');
const anchors = require('./anchors.js');
const reactComponent = require('./react-component.js')

const CWD = process.cwd();

const alias = {
  js: 'jsx',
  html: 'markup',
  sh: 'bash',
  md: 'markdown',
};

class MarkdownRenderer {
  constructor() {
    const siteConfig = require(`${CWD}/siteConfig.js`);
    let markdownOptions = {
      // Highlight.js expects hljs css classes on the code element.
      // This results in <pre><code class="hljs css languages-jsx">
      langPrefix: 'hljs css language-',
      highlight(str, lang) {
        // User's own custom highlighting function
        if (siteConfig.highlight && siteConfig.highlight.hljs) {
          siteConfig.highlight.hljs(hljs);
        }
        // Fallback to default language
        lang =
          lang || (siteConfig.highlight && siteConfig.highlight.defaultLang);
        if (lang === 'text') {
          return str;
        }
        if (lang) {
          try {
            if (
              siteConfig.usePrism === true ||
              (siteConfig.usePrism &&
                siteConfig.usePrism.length > 0 &&
                siteConfig.usePrism.indexOf(lang) !== -1)
            ) {
              const language = alias[lang] || lang;
              try {
                // Currently people using prismjs on Node have to individually require()
                // every single language (https://github.com/PrismJS/prism/issues/593)
                require(`prismjs/components/prism-${language}.min`);
                return prismjs.highlight(str, prismjs.languages[language]);
              } catch (err) {
                if (err.code === 'MODULE_NOT_FOUND') {
                  const unsupportedLanguageError = chalk.yellow(
                    `Warning: ${chalk.red(
                      language,
                    )} is not supported by prismjs.` +
                    '\nPlease refer to https://prismjs.com/#languages-list for the list of supported languages.',
                  );
                  console.log(unsupportedLanguageError);
                } else console.error(err);
              }
            }
            if (hljs.getLanguage(lang)) {
              return hljs.highlight(lang, str).value;
            }
          } catch (err) {
            console.error(err);
          }
        }

        try {
          return hljs.highlightAuto(str).value;
        } catch (err) {
          console.error(err);
        }

        return '';
      },
      html: true,
      linkify: true,
    };

    // Allow overriding default options
    if (siteConfig.markdownOptions) {
      markdownOptions = deepmerge(
        {},
        markdownOptions,
        siteConfig.markdownOptions,
      );
    }

    const md = new Markdown(markdownOptions);
    md.renderer = new ReactRenderer({
      components: {
        react: reactComponent(siteConfig.reactComponents || {}),
        anchor: anchors
      },
      tokens: {
        fence: ({ params }) => {
          if (params === 'react') {
            return 'react';
          }
          return ['pre', 'code']
        },
        heading_open: ({ hLevel }) => [`h${hLevel}`, 'anchor']
      }
    });

    // Allow client sites to register their own plugins
    if (siteConfig.markdownPlugins) {
      siteConfig.markdownPlugins.forEach(plugin => {
        md.use(plugin);
      });
    }

    this.md = md;
  }

  render(source) {
    return this.md.render(source);
  }
}

const renderMarkdown = new MarkdownRenderer();

module.exports = source => renderMarkdown.render(source);
