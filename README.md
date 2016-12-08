# Tim Hall's Personal Site

# Development

- [Github Pages Help](https://help.github.com/articles/setting-up-your-github-pages-site-locally-with-jekyll/)
- [github-metadata](https://github.com/jekyll/github-metadata#authentication)
- [Fix Metadata Error](http://knightcodes.com/miscellaneous/2016/09/13/fix-github-metadata-error.html)
- [Forced github-pages version](https://github.com/github/pages-gem#usage)

Prerequisites

1. Install ruby >= 2.1.0 (`ruby -v`)
2. Install bundler `gem install bundler`
3. Install gems `bundle install`
4. Set system environment variable `JEKYLL_GITHUB_TOKEN=(public_repo scope token)`
5. Possibly, set `SSL_CERT_FILE` system environment variable (see "Fix Metadata Error" above)

Running

1. `bundle exec jekyll serve`