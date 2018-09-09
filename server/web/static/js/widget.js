var WIDGET_ELEMENT_ID = "widgetArea";

/**
 * Widget option class.
 */
class WidgetOption
{

    /**
     * Widget option construct.
     * @param {string} name 
     * @param {string} image
     * @param {callback} callback
     */
    constructor(name, image, callback)
    {
        this.name = String(name);
        this.image = image;
        this.callback = callback;
    }

}

/**
 * Widget base class.
 */
class WidgetBase
{

    /**
     * Widget constructor.
     */
    constructor()
    {
        this.element = null;
    }

    /**
     * Get name of this widget.
     */
    getName()
    {
        return "base";
    }

    /**
     * Get user friendly title for this widget.
     */
    getTitle()
    {
        return "Base";
    }

    /**
     * Get widget options to place in top
     * right corner.
     */
    getOptions(){
        return [
            new WidgetOption(
                "Help",
                "/static/img/opt_help.png",
                this.showOptionHelp
            )
        ];
    }

    /**
     * Build widget options element.
     */
    _buildWidgetOptionsElement()
    {
        var element = document.createElement("div");
        element.classList.add("widgetOptions");
        var options = this.getOptions();
        for (var i = 0; i < options.length; i++) {
            var optionElement = document.createElement("a")
            optionElement.classList.add("widgetOption");
            var optionImageElement = document.createElement("img");
            optionImageElement.src = options[i].image;
            optionImageElement.title = options[i].name;
            optionImageElement.alt = options[i].name;
            optionElement.appendChild(optionImageElement);
            optionElement.addEventListener("click", options[i].callback);
            element.appendChild(optionElement);
        }
        return element;
    }

    /**
     * Build widget header element.
     */
    _buildWidgetHeaderElement()
    {
        var element = document.createElement("div");
        element.classList.add("widgetHeader");
        // title
        var titleElement = document.createElement("div");
        titleElement.classList.add("widgetTitle");
        titleElement.innerText = this.getTitle();
        element.appendChild(titleElement);
        // options
        element.appendChild(this._buildWidgetOptionsElement());
        return element;
    }

    /**
     * Build widget body.
     */
    _buildWidgetBodyElement()
    {
        var element = document.createElement("div");
        element.classList.add("widgetBody");
        return element;
    }

    /**
     * Build widget element.
     */
    buildElement()
    {
        var element = document.createElement("div");
        element.classList.add("widget");
        element.classList.add("widget-" + this.getName());
        element.appendChild(this._buildWidgetHeaderElement());
        element.appendChild(this._buildWidgetBodyElement());
        return element;
    }

    /**
     * Get body element of active widget.
     */
    getBodyElement()
    {
        if (!this.element) {
            return null;
        }
        return this.element.getElementsByClassName("widgetBody")[0];
    }

    /**
     * Add widget to widget area.
     */
    add()
    {
        this.element = this.buildElement()
        document.getElementById(WIDGET_ELEMENT_ID).appendChild(this.element);
    }

    /**
     * Show help for this widget.
     */
    showOptionHelp()
    {
        alert("Widget help here!");
    }

}