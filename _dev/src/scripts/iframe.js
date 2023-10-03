import { ref } from 'vue' 
import { HttpClient } from "../services/HttpClient";
import emitter from 'tiny-emitter/instance'
import {toolbar} from './toolbar';
import { useStore, storedZones, contextShop } from '../store/currentBlock'
import Block from './block'

import { createToaster } from "@meforma/vue-toaster";
const toaster = createToaster({
    position: 'top',
  });
export default class Iframe {
    current_url = ref();
    id_lang = ref(0);
    id_shop = ref(0);
    loader = ref(false)
    events = ['dragenter', 'dragover', 'dragleave', 'drop']
    preventDefaults = (e) => {
        e.preventDefault()
    }
    
    constructor(current_url, id_lang, id_shop)
    {
        this.current_url.value = current_url
        this.id_lang.value = id_lang
        this.id_shop.value = id_shop  
        this.loader.value = false
    }
    

    /**
     * When register on Element after Ajax
     */
    // async registerDrop (el) {
    //     let currentBlock = useStore()
      
    //     const params = {
    //         ajax: true,
    //         block: currentBlock.code,
    //         action: 'BlockRender',
    //     }
      
    //     try {
    //       const data = await HttpClient.get(ajax_urls.block_url, params);
      
    //       let newNode = document.createElement('div')
    //       newNode.innerHTML = data.html + '<div class="blocks  border-dotted text-center w-100 p-5 mt-5">Zone de drop</div>'
    //       el.target.parentNode.replaceChild(newNode, el.target)
    //       newNode.addEventListener('click', (el) => {
    //           registerClickPopup(el)
    //       })
    //       newNode.addEventListener('drop', (el) => {
    //           registerDrop(el)
    //           registerDragEnter(el)
    //           registerDragLeave(el)
    //           setTimeout(() => {
    //               emitter.emit('triggerLoadedEvents', el)
    //           }, 200)
    //       })
    //       setTimeout(() => {
    //           emitter.emit('triggerLoadedEvents', el)
    //       }, 200)
    //     } catch (error) {
    //       console.error(error);
    //     }
    //   }
      

    /**
     * 
     * @param {*} url 
     * For set URL in input
     */
    setUrl(url)
    {
        this.current_url.value = url
    }

    async reloadIframe() {
        this.loader.value = true
        let iframe = document.getElementById('website-iframe')
        iframe.src = this.current_url.value

        // setTimeout(() => {
        //     var x = iframe.contentWindow;
        //         x.location.reload(true)
        //     }, 200)    
        this.loadIframe()
        this.loader.value = false
    }

    /**
 * trigger popup with blocks choice on Click
 */
registerClickPopup (el) {
    let zone_name = el.target.getAttribute('data-zone-name')
    emitter.emit('toggleModal', zone_name)
}


/**
 * DragEnter Event
 */
registerDragEnter(el) {
    el.target.classList.remove('border-dark')
    el.target.classList.add('border-danger')
}

/**
 * DragLeave event
 */
registerDragLeave  (el) {
    el.target.classList.remove('border-danger')
    el.target.classList.add('border-dark')
}

registerClick (el) {
    let id_prettyblocks = el.getAttribute('data-id-prettyblocks')
    emitter.emit('loadStateConfig', id_prettyblocks)
}

async getZones(document) {
    let els = document.querySelectorAll('[data-zone-name]')
    let zones = []
   
    await els.forEach((el) => {
        let zone_name = el.getAttribute('data-zone-name')
        if(zones.indexOf(zone_name) == -1){
            zones.push(zone_name)
        }
    })


    let piniazones = storedZones()
    piniazones.$patch({
        zones: zones
    })

    return zones
}

sendPrettyBlocksEvents(eventType, data = []) { 
    let message = { type: eventType, data: data };
    let iframe = document.getElementById('website-iframe')
    iframe.contentWindow.postMessage(message, "*");
}

async loadIframe () {
    // iframe
    
    // Définir l'eventHandler
    let eventHandler = (event) => {
        if(event.data.type == 'zones')
        {
            let zones = event.data.data
            let piniazones = storedZones()
            piniazones.$patch({
                zones: zones
            })
            emitter.emit('loadZones', zones)
            console.log('zonesLOADED', zones)
        }
        if(event.data.type == 'loadStateConfig')
        {
            let id_prettyblocks = event.data.data
            emitter.emit('loadStateConfig', id_prettyblocks)
        }
        window.removeEventListener("message", eventHandler, false);
    }

    window.addEventListener("message", eventHandler, false);
   

    this.loader.value = true
    let iframe = await document.getElementById('website-iframe')

    if (iframe) {
        await iframe.addEventListener('load', (e) => {

            
            this.sendPrettyBlocksEvents('initIframe')
            this.sendPrettyBlocksEvents('getZones')
            // let message = { type: "getZones", data: [] };
            // iframe.contentWindow.postMessage(message, "*");
            let doc = e.target.contentWindow.document
            let jQuery = e.target.contentWindow.$
            let iwindow = e.target.contentWindow
            let body = doc.body
            emitter.off('triggerLoadedEvents')
            emitter.on('triggerLoadedEvents', (dom) => {
                // trigger for init theme
                // e.target.contentWindow.dispatchEvent(new Event('load'));cz-homecategory order-4
                jQuery(doc).trigger("reloadEverything");
            })


            // this.events.forEach((eventName) => {
            //     doc.body.addEventListener(eventName, this.preventDefaults)
            // })
           
            emitter.off('stateUpdated')
            emitter.on('stateUpdated', (id_prettyblocks) => {
                let currentBlock = useStore()
                let html = this.getBlockRender(id_prettyblocks)
                // update module in iFrame !
                html.then((data) => {
                    this.sendPrettyBlocksEvents('updateHTMLBlock', {id_prettyblocks: id_prettyblocks, html: data})
                    const tb = new toolbar( body.querySelectorAll('.ptb-title'), doc, iwindow);
                    this.loadToolBar(tb)
                })

            })

            // when iframe loaded, get blocks
            emitter.off('scrollInIframe')
            emitter.on('scrollInIframe', (id_prettyblocks) => {
                this.sendPrettyBlocksEvents('scrollInIframe', id_prettyblocks)
            })

            // hover blocks 
            // body.querySelectorAll('div[data-block]').forEach((div) => {
            //     div.addEventListener('click', (el) => {
            //         this.registerClick(el.target)
            //     })
            // })
            emitter.off('focusOnZone')
            emitter.on('focusOnZone', (zone_name) => {
                this.sendPrettyBlocksEvents('focusOnZone', zone_name)
               
                emitter.emit('initStates')

            })
            body.querySelectorAll('main div.blocks').forEach((div) => {
                div.addEventListener('click', (el) => {
                    this.registerClickPopup(el)
                })
               
                // div.addEventListener('drop', (el) => {
                //     this.registerDrop(el)
                // }, false)
                div.addEventListener('dragenter', (el) => {
                    this.registerDragEnter(el)
                })
                div.addEventListener('dragleave', (el) => {
                    this.registerDragLeave(el)
                })

            })

            const tb = new toolbar( body.querySelectorAll('.ptb-title'), doc, iwindow);
            this.loadToolBar(tb)

            // check if block is already selected
            let currentBlock = useStore()
            if(currentBlock.subSelected)
            {
                emitter.emit('scrollInIframe', currentBlock.id_prettyblocks)
            }

            // we inject css in iframe
            let cssLink = doc.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = base_url + 'modules/prettyblocks/build/iframe.css';
            cssLink.type = 'text/css';
            cssLink.media = 'all';
            doc.head.appendChild(cssLink);

            this.loadContext(e)
            
        }, false)
    }
}

loadToolBar(tb)
{
    tb.on('change', async (oldValue, newValue) => {
        this.updateTitleComponent(oldValue)
    })
}
/**
 * Updpate title component in Config field using Toolbar
 * @param {*} newValue 
 */
async  updateTitleComponent(newValue)
{
    let id_block = newValue.html.closest('[data-id-prettyblocks]').getAttribute('data-id-prettyblocks')
    let field = newValue.html.getAttribute('data-field')
    let index = null
    if(newValue.html.hasAttribute('data-index'))
    {
        index = newValue.html.getAttribute('data-index')
    }
    
    let element = await Block.loadById(id_block)
    // emitter.emit('displayBlockConfig', element)
    let context = contextShop()
    let data = {
        id_prettyblocks: id_block,
        element: newValue,
        ctx_id_lang: context.id_lang,
        ctx_id_shop: context.id_shop,
        field: field,
        ajax: true,
        index: index,
        action: 'updateTitleComponent',
        ajax_token: security_app.ajax_token
    }
    
    try {
        const response = await HttpClient.post(ajax_urls.api, data);
        toaster.show(response.message);
    } catch (error) {
        console.error(error);
    }
    


}

loadContext(e)
{
    let iwindow = e.target.contentWindow
    let context = contextShop()
    context.$patch({
        id_lang: iwindow.prestashop.language.id,
        id_shop: iwindow.prestashop.modules.prettyblocks.id_shop,
        shop_name: iwindow.prestashop.modules.prettyblocks.shop_name,
        current_url: iwindow.prestashop.modules.prettyblocks.shop_current_url,
        href: iwindow.document.location.href
    })
    this.id_lang.value = iwindow.prestashop.language.id
    this.id_shop.value = iwindow.prestashop.modules.prettyblocks.id_shop
    emitter.emit('initStates')
    this.loader.value = false
}

destroy() {
    // 1. Supprimer les écouteurs d'événements globaux
    emitter.off('triggerLoadedEvents');
    emitter.off('stateUpdated');
    emitter.off('scrollInIframe');
    emitter.off('focusOnZone');
    // 3. Réinitialiser les propriétés de l'objet
    this.current_url.value = null;
    this.id_lang.value = 0;
    this.id_shop.value = 0;
    this.loader.value = false;
}



async getBlockRender (id_prettyblocks) {
    let context = contextShop()
    let responseData = {}
    const params = {
        ajax: true,
        id_prettyblocks: id_prettyblocks,
        action: 'GetBlockRender',
        ctx_id_lang: context.id_lang,
        ctx_id_shop: context.id_shop,
        ajax_token: security_app.ajax_token
    }
  
    try {
        const data = await HttpClient.get(ajax_urls.block_url, params);
        responseData = data.html;
    } catch (error) {
        console.error(error);
    }
  
    return responseData;
  }
  

   



}