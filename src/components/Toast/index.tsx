
export default function Toast(msg:string, duration?:number|undefined):void{
    const d = duration || 3000
    const m = document.createElement('div')
    m.innerHTML = msg
    m.style.cssText = "max-width:60%;min-width: 150px;padding:0 14px;height: 40px;color: rgb(255, 255, 255);line-height: 40px;text-align: center;border-radius: 4px;position: fixed;top: 50%;left: 50%;transform: translate(-50%, -50%);z-index: 9999999999;background: rgba(0, 0, 0,.7);font-size: 16px;"
    document.body.appendChild(m)
    setTimeout(() => {
      const dd = 0.5
      m.style.webkitTransition = '-webkit-transform '+dd+'s ease-in, opacity ' + dd + 's ease-in'
      m.style.opacity = '0'
      setTimeout(() => {
        document.body.removeChild(m)
      }, dd*1000);
    }, d);
  }
  