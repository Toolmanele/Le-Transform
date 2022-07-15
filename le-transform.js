var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array
class LeTransform {
  constructor(el) {
    let _el
    if (typeof el === 'string') {
      console.log(/^matrix\([\d,]+\)$/.test(el))
      if (/matrix\([\d,]+\)/.test(el)) {
        this.matrix = this.parse(el)
      } else {
        _el = document.querySelector(el)
      }
    } else if (el instanceof Element) {
      _el = el
    } else if (el instanceof ARRAY_TYPE) {
      this.matrix = this.createMatrix()
      for (let i = 0; i < el.length; i++) {
        this.matrix[i] = el[i]
      }
    } else if (el instanceof LeTransform) {
      this.matrix = el._copy()
    }
    if (_el) {
      this.matrix = this.parseEl(_el)
    }

    if (!this.matrix) {
      console.log('输入不合法')
    }
  }

  get transform() {
    return this.matrix2transform()
  }

  // 复制 leTransform
  copy() {
    return new LeTransform(this.matrix)
  }
  // 复制 matrix
  _copy() {
    let m = this.createMatrix()
    for (let i = 0; i < this.matrix.length; i++) {
      m[i] = this.matrix[i]
    }
    return m
  }
  matrix2transform() {
    let m = this.matrix
    const degrees = 180 / Math.PI
    let r0 = [m[0], m[1]],
      r1 = [m[2], m[3]],
      kx = transNormalize(r0),
      kz = transDot(r0, r1),
      ky = transNormalize(transCombine(r1, r0, -kz))
    return {
      translate: [m[4], m[5]],
      rotate: Math.atan2(m[1], m[0]) * degrees,
      scale: [kx, ky],
      skewX: (kz / ky) * degrees,
    }

    function transDot(a, b) {
      return a[0] * b[0] + a[1] * b[1]
    }
    // normalize 化
    function transNormalize(a) {
      let k = Math.sqrt(transDot(a, a))
      a[0] /= k
      a[1] /= k
      return k
    }

    function transCombine(a, b, k) {
      a[0] += k * b[0]
      a[1] += k * b[1]
      return a
    }
  }
  // 获取元素的 matrix
  parseEl(el) {
    let style = getComputedStyle(el)
    let t = style.transform
    if (t === 'none') {
      return this.createMatrix()
    } else {
      return this.parse(t)
    }
  }

  // 解析
  // 'matrix(1, 0, 0, 1, 100, 100)'
  parse(matrixStr) {
    let m = this.createMatrix()
    matrixStr
      .slice(7, -1)
      .split(',')
      .map((v) => parseFloat(v))
      .forEach((v, i) => {
        m[i] = v
      })
    return m
  }

  // 初始化一个空白的 matrix
  createMatrix() {
    var out = new ARRAY_TYPE(6)

    if (ARRAY_TYPE != Float32Array) {
      out[1] = 0
      out[2] = 0
      out[4] = 0
      out[5] = 0
    }

    out[0] = 1
    out[3] = 1
    return out
  }
invert() {
    var a = this.matrix
    var aa = a[0],
      ab = a[1],
      ac = a[2],
      ad = a[3]
    var atx = a[4],
      aty = a[5]
    var det = aa * ad - ab * ac

    if (!det) {
      return null
    }

    det = 1.0 / det
    var out = this.createMatrix()
    out[0] = ad * det
    out[1] = -ab * det
    out[2] = -ac * det
    out[3] = aa * det
    out[4] = (ac * aty - ad * atx) * det
    out[5] = (ab * atx - aa * aty) * det

    this.matrix = out
    return this
  }
  multiply(a) {
    var b = this.matrix
    var a0 = a[0],
      a1 = a[1],
      a2 = a[2],
      a3 = a[3],
      a4 = a[4],
      a5 = a[5]
    var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3],
      b4 = b[4],
      b5 = b[5]
    var out = this.createMatrix()
    out[0] = a0 * b0 + a2 * b1
    out[1] = a1 * b0 + a3 * b1
    out[2] = a0 * b2 + a2 * b3
    out[3] = a1 * b2 + a3 * b3
    out[4] = a0 * b4 + a2 * b5 + a4
    out[5] = a1 * b4 + a3 * b5 + a5
    this.matrix = out
    return this
  }
  // 针对平移进行优化,因为平移才是大量的操作
  get trans() {
    return [this.matrix[4], this.matrix[5]]
  }
  translate(x, y) {
    return this.multiply(this.createFromTranslate(x, y))
  }
  scale(x, y) {
    return this.multiply(this.createFromScaling(x, y))
  }
  rotate(deg) {
    return this.multiply(this.createFromRotate(deg))
  }
  getXY(x, y) {
    let m = this.matrix
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
  }
  invert() {
    let a = this.matrix
    let m = this.createMatrix()
    var aa = a[0],
      ab = a[1],
      ac = a[2],
      ad = a[3]
    var atx = a[4],
      aty = a[5]
    var det = aa * ad - ab * ac

    if (!det) {
      return null
    }

    det = 1.0 / det
    m[0] = ad * det
    m[1] = -ab * det
    m[2] = -ac * det
    m[3] = aa * det
    m[4] = (ac * aty - ad * atx) * det
    m[5] = (ab * atx - aa * aty) * det
    return new LeTransform(m)
  }
  createFromRotate(deg) {
    var out = this.createMatrix()
    var rad = (Math.PI * deg) / 180
    var s = Math.sin(rad)
    var c = Math.cos(rad)
    out[0] = c
    out[1] = s
    out[2] = -s
    out[3] = c
    return out
  }
  // 从 translate 创建矩阵
  createFromTranslate(x, y) {
    var out = this.createMatrix()
    out[4] = x
    out[5] = y
    return out
  }
  createFromScaling(x, y) {
    var out = this.createMatrix()
    out[0] = x
    out[3] = y
    return out
  }
  // 转化为 transform 输出
  toString() {
    // `matrix()`
    return `matrix(${this.matrix.toString()})`
  }
// 从 range 变到 domain
// 需要多少 offset , 和 多少 scale
// 很玄乎对吧 ,就是 k / b
  static getTransform(range, domain) {
    var x1 = range[0]
    var x2 = range[1]
    var y1 = domain[0]
    var y2 = domain[1]
    // 求 r1 在 x1,x2 什么位置
    var k = (y2 - y1) / (x2 - x1)
    var b = (y1 * x2 - y2 * x1) / (x2 - x1)
    return {
      scale: k,
      translate: b,
    }
  }

  // 两个 rect 之间怎么 transform
  // 这样我们就可以进行灵活的变化了
  static getTransformRect(rect, targetRect) {
    var xTrans = LeTransform.getTransform([rect.left,rect.right],[targetRect.left,targetRect.left])
    var yTrans = LeTransform.getTransform([rect.top,rect.bottom],[targetRect.top,targetRect.bottom])
    return {
      scale:[xTrans.scale,yTrans.scale]
      translate:[xTrans.translate,yTrans.translate]
    }
  }
}
