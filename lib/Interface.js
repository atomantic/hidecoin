'use strict'

const blessed = require('blessed')
const R = require('ramda')
const _ = require('lodash')
const moment = require('moment')

const storage = require('./Storage')
const Block = require('./Block')
const Tx = require('./Tx')

class Interface {

  constructor() {
    this.stat = {
      hps: 0,
      rps: 0,
      blk: 0,
      snc: 5,
      sncColor: 'white'
    }
    
    this.screen = blessed.screen({
      smartCSR: true
    })
    this.screen.title = 'XHD Core'
    this.boxes = {
      header: blessed.box({
        parent: this.screen,
        top: 0,
        left: 0,
        right: 0,
        bottom: this.screen.height - 1,
        content: '{bold}HPS    0 RPS    0 BLK        0 SNC 5{/bold}',
        tags: true,
        style: {
          fg: 'white',
          bg: 'cyan',
        }
      }),
      console: blessed.box({
        parent: this.screen,
        top: 1,
        left: 0,
        right: 0,
        bottom: 1,
        tags: true,
        style: {
          fg: 'white',
          bg: 'black',
        }
      }),
      blocks: blessed.box({
        parent: this.screen,
        top: 1,
        left: 0,
        right: 0,
        bottom: 1,
        content: '{center}{bold}Block Explorer{/bold}{/center}',
        tags: true,
        style: {
          fg: 'white',
          bg: 'black'
        }
      }),
      footer: blessed.box({
        parent: this.screen,
        top: this.screen.height - 1,
        left: 0,
        right: 0,
        bottom: 0,
        content: 'F1 Cnsl F2 Blks F5 Snc- F6 Snc+ F10 Quit',
        tags: true,
        style: {
          fg: 'white',
          bg: 'blue',
        }
      })
    }
    this.blockBoxes = {
      lastBlock: blessed.box({
        parent: this.boxes.blocks,
        top: 1,
        left: 0,
        right: 0,
        bottom: 0,
        content: 'Last block info',
        tags: true,
        style: {
          fg: 'white',
          bg: 'black',
          scrollbar: {
            fg: 'blue',
            bg: 'blue'
          }
        },
        scrollbar: true,
        scrollable: true,
        keys: true
      })
    }
    this.boxes.console.setFront()
    this.screen.render()
    
    this.screen.on('resize', () => {
      this.boxes.header.bottom = this.screen.height - 1
      this.boxes.footer.top = this.screen.height - 1
      this.boxes.footer.bottom = 0
      this.screen.render()
    })
    
    this.screen.key('f1', () => {
      this.boxes.console.setFront()
      this.boxes.console.focus()
      this.screen.render()
    })
    
    this.screen.key('f2', () => {
      const block = Block.getLast()
      this.blockBoxes.lastBlock.setContent('Last block info')
      this.blockBoxes.lastBlock.pushLine('ID   {bold}' + block.id + '{/bold}')
      this.blockBoxes.lastBlock.pushLine('Hash {bold}' + block.hash.toString('hex') + '{/bold}')
      
      const blockUnpacked = Block.unpack(block.data)
      this.blockBoxes.lastBlock.pushLine('Time {bold}' + moment(blockUnpacked.time * 1000 - moment().utcOffset() * 60000).format('YYYY-MM-DD HH:mm:ss') + '{/bold}')
      this.blockBoxes.lastBlock.pushLine('Diff {bold}' + blockUnpacked.diff.toString('hex') + '{/bold}')
      this.blockBoxes.lastBlock.pushLine('Txs  {bold}' + blockUnpacked.txCount + '{/bold}')
      this.blockBoxes.lastBlock.pushLine('')
      
      let txList = R.map(tx => Tx.unpack(tx), blockUnpacked.txList)
      for (let i in txList) {
        const txHash = blockUnpacked.txHashList[i]
        const tx = blockUnpacked.txList[i]
        
        this.blockBoxes.lastBlock.pushLine(txHash.toString('hex'))
      }
      
      this.boxes.blocks.setFront()
      this.boxes.blocks.focus()
      this.screen.render()
    })
    
    storage.on('log', (...data) => {
      this.logConsole(R.join(' ', R.map((line) => {
        return typeof line === 'object' ? JSON.stringify(line) : line
      }, data)))
    })
    
    storage.on('stat', (data) => {
      if (data.hps) {
        this.stat.hps = data.hps
      }
      if (data.rps) {
        this.stat.rps = data.rps
      }
      if (data.blk) {
        this.stat.blk = data.blk
      }
      if (data.snc) {
        this.stat.snc = data.snc
      }
      if (data.sncColor) {
        this.stat.sncColor = data.sncColor
      }
      this.boxes.header.setLine(0, '{bold}HPS ' + _.padStart(this.stat.hps, 4) + ' RPS ' + _.padStart(this.stat.rps, 4) + ' BLK ' + _.padStart(this.stat.blk, 8) + ' {' + this.stat.sncColor + '-fg}SNC ' + this.stat.snc + '{/' + this.stat.sncColor + '-fg}{/bold}')
      this.screen.render()
    })
  }
  
  key(...args) {
    this.screen.key(...args)
  }
  
  close() {
    this.screen.destroy()
  }
  
  logConsole(...data) {
    R.forEach((line) => {
      this.boxes.console.pushLine(line)
    }, data)
    const extraLines = this.boxes.console.getScreenLines().length - this.screen.height + 2
    if (extraLines > 0) {
      for (let i = 0; i < extraLines; i++) {
        this.boxes.console.shiftLine(0)
      }
    }
    this.screen.render()
  }
}

const ifc = new Interface()
module.exports = ifc