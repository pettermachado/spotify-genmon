#!/usr/bin/env node

let font,
  mainPrefix,
  trackPrefix,
  artistPrefix,
  albumPrefix,
  timePrefix

let length = 30

const args = process.argv.slice(2)

for (let i = 0; i < args.length; i++) {
  const opt = args[i].trim()
  switch (opt) {
    case '-f':
    case '--font':
      font = args[i+1]
      i++
      break
    case '-l':
    case '--length':
      raw = args[i+1]
      length = parseInt(raw, 10)
      if (isNaN(length)) {
        console.error(`invalid option ${opt}: \`${raw}\` is not a number.`)
        process.exit(1)
      }
      i++
      break
    case '--mainPrefix':
      mainPrefix = args[i+1].trim()
      i++
      break
    case '--trackPrefix':
      trackPrefix = args[i+1].trim()
      i++
      break
    case '--artistPrefix':
      artistPrefix = args[i+1].trim()
      i++
      break
    case '--albumPrefix':
      albumPrefix = args[i+1].trim()
      i++
      break
    case '--timePrefix':
      timePrefix = args[i+1].trim()
      i++
      break
    case '--version':
    case '-v':
      const pkg = require('./package.json')
      console.log(pkg.version)
      return
    case '--help':
    case '-h':
      console.log('spotify-genmon')
      console.log('')
      console.log('Usage: spotify-genmon [options]')
      console.log('')
      console.log('Options')
      console.log('  --font, -f     Set the font of the output. Eg. Monospace Bold 9')
      console.log('  --length, -l   Maximum length of the main string. Default: 30')
      console.log('  --mainPrefix   Main prefix')
      console.log('  --trackPrefix  Track prefix displayed in the tooltip')
      console.log('  --artistPrefix Artist prefix displayed in the tooltip')
      console.log('  --albumPrefix  Album prefix displayed in the tooltip')
      console.log('  --timePrefix   Time prefix displayed in the tooltip')
      console.log('  --version, -v  Display version')
      console.log('  --help, -h     Display this help message')
      return
  }
}

// Connect on session bus
const bus = require('dbus').getBus('session')

// Disconnect when done to exit script
function done() {
  bus.disconnect()
}


const ifaceOpts = {
  NAME: 'org.mpris.MediaPlayer2.spotify',
  PATH: '/org/mpris/MediaPlayer2',
  IFACE: 'org.mpris.MediaPlayer2.Player'
}

bus.getInterface(ifaceOpts.NAME, ifaceOpts.PATH, ifaceOpts.IFACE, function (err, iface) {
  if (err) {
    console.log('')
    done()
    return
  }

  iface.getProperty('Metadata', function (err, metadata) {
    const id = metadata['mpris:trackid']

    if (!id) {
      console.log('')
      done()
      return
    }

    const title = metadata['xesam:title']
    const artists = metadata['xesam:albumArtist'] // Array(string)
    const album = metadata['xesam:album']
    const artistsStr = formatArtists(artists)
    const durationStr = formatDuration(metadata['mpris:length'])

    const toolStr = [
      title       ? `${formatPrefix(trackPrefix)}${title}` : null,
      artistsStr  ? `${formatPrefix(artistPrefix)}${artistsStr}` : null,
      album       ? `${formatPrefix(albumPrefix)}${album}`        : null,
      durationStr ? `${formatPrefix(timePrefix)}${durationStr}` : null
    ]
      .filter(Boolean)
      .join('\n')

    const fontAttr = font
      ? ` font='${font}'`
      : ''

    const main = formatMain(artists[0], title, length)
    console.log(`<txt><span${fontAttr}>${formatPrefix(mainPrefix)}${main}</span></txt>`)
    console.log(`<tool>${toolStr}</tool>`)
    done()
  })
})

function formatPrefix(emoji) {
  return emoji
    ? `${emoji} `
    : ''
}

function formatMain(title, artist, size) {
  const str = [
    artist ? artist : null,
    title ? title : null
  ]
    .filter(Boolean)
    .join(' • ')

  if (str.length > size) {
    return str.substr(0, size - 3) + '...'
  }

  return str
}

function formatArtists(artists) {
  return artists.reduce(function (acc, artist, i) {
    if (acc === '') return artist
    let sep = ', '
    if (i === artists.length - 1) sep = ' &amp; '
    return acc + sep + artist
  }, '')
}

function formatDuration(d) {
  const ns = 1000 * 1000
  const h = Math.floor(d / (ns * 60 * 60))
  const m = Math.floor((d - h * ns * 60 * 60) / (ns * 60))
  const s = Math.round((d - h * ns * 60 * 60 - m * ns * 60) / ns)

  const parts = h == 0
    ? [m, pad(s)]
    : [h, pad(m), pad(s)]

  return parts.join(':')
}

function pad(n) {
  if (n < 10) return '0' + n
  return '' + n
}
