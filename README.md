# Calder
[![CircleCI](https://circleci.com/gh/calder-gl/calder/tree/master.svg?style=svg)](https://circleci.com/gh/calder-gl/calder/tree/master)

A library for sculpting and manipulating complex 3D structures for the web.

Written by Paul Bardea, Tammy Liu, Abhishek Madan, Andrew McBurney, and Dave Pagurek van Mossel

### Development Setup

```bash
yarn install
```

### Testing

```bash
yarn test
```

### Examples
To generate the examples files (under `/examples`), run:

```bash
yarn webpack
```

To add a new example:
- Add the example typescript file in `/src/examples`
- add the typescript file as an entrypoint in `webpack.config.js`
- Create a new HTML file in `/examples`

### Contributing
Run the autoformatter on your code:

```bash
yarn fix-format
```
