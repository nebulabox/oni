/**
 * Icons
 *
 * - Data source for icons present in Oni
 * - Loads icons based on the `ui.iconTheme` configuration setting
 */

import * as path from "path"

import { Event, IEvent } from "oni-types"

import { PluginManager } from "./../../Plugins/PluginManager"

// import { IConfigurationValues } from "./Configuration"
// import { getThemeManagerInstance, ThemeManager } from "./Themes"

export interface IIconFontSource {
    path: string
    format: string
}

export interface IIconFont {
    id: string
    src: IIconFontSource[]
    weight: string
    style: string
    size: string
}

export interface IIconDefinition {
    fontCharacter: string
    fontColor: string
}

export interface IIconInfo extends IIconDefinition {
    fontFamily: string
    weight: string
    style: string
    size: string
}

export type IconDefinitions = { [key: string]: IIconDefinition }

// File extension -> icon definition key
export type FileDefinitions = { [extension: string]: string }

// File name -> icon definition key
export type FileNames  = { [fileName: string]: string }

// Language id -> icon definition key
export type Language = { [language: string]: string }

export interface IIconTheme {
    fonts: IIconFontSource
    iconDefinitions: IconDefinitions
    file: string
    fileExtensions: FileDefinitions
    fileNames: FileNames
    languageIds: Language
}

import * as fs from "fs"
import { IIconThemeContribution } from "./../../Plugins/Api/Capabilities"

export class Icons {

    private _activeIconTheme: IIconTheme = null
    private _onIconThemeChangedEvent: Event<void> = new Event<void>()

    public get activeIconTheme(): IIconTheme {
        return this._activeIconTheme
    }

    public get onIconThemeChanged(): IEvent<void> {
        return this._onIconThemeChangedEvent
    }

    public getIconClassForFile(fileName: string, language?: string): string {

        if (!this._activeIconTheme) {
            return null
        }

        const normalizedFileName = fileName.toLowerCase()
        const classBase = "fa oni-icon oni-icon-"

        // First, see if there is a matching file name
        if (this._activeIconTheme.fileNames) {
            const fileNameIcon = this._activeIconTheme.fileNames[normalizedFileName]

            if (fileNameIcon) {
                return classBase + fileNameIcon
            }
        }

        // Next, see if there is a matching extension
        if (this._activeIconTheme.fileExtensions) {
            const extension = path.extname(fileName)
            if (extension && extension.length > 1) {
                const extensionWithoutPeriod = extension.substring(1, extension.length)

                
                const matchingExtension = this._activeIconTheme.fileExtensions[extensionWithoutPeriod]
                if (matchingExtension) {
                    return classBase + matchingExtension
                }
            }
        }

        // Finally, see if there is a matching language
        if (language && this._activeIconTheme.languageIds) {
            const matchingLanguage = this._activeIconTheme.languageIds[language]

            if (matchingLanguage) {
                return classBase + matchingLanguage
            }
        }

        if (this._activeIconTheme.file) {
            return classBase + this._activeIconTheme.file
        }

        return null
    }

    constructor(
        private _pluginManager: PluginManager
    ) { }

    public async applyIconTheme(themeName: string): Promise<void> {

        const plugins = this._pluginManager.plugins

        const pluginsWithThemes = plugins.filter((p) => {
            return p.metadata && p.metadata.contributes && p.metadata.contributes.iconThemes
        })

        const allIconThemes = pluginsWithThemes.reduce((previous: IIconThemeContribution[], current) => {
            const iconThemes = current.metadata.contributes.iconThemes
            return [
                ...previous,
                ...iconThemes
            ]
        }, [] as IIconThemeContribution[])

        const matchingIconTheme = allIconThemes.find((t) => t.id === themeName)

        if (!matchingIconTheme || !matchingIconTheme.path) {
            return null
        }

        const contents = await new Promise<string>((resolve, reject) => {
            fs.readFile(matchingIconTheme.path, "utf8", (err, data: string) => {
                if (err) {
                    reject(err)
                    return
                }

                resolve(data)
            })
        })

        // From stackoverflow: 
        // https://stackoverflow.com/questions/11355147/font-face-changing-via-javascript
        this._activeIconTheme = JSON.parse(contents) as IIconTheme

        var newStyle = document.createElement("style")

        const styleWriter = new StyleWriter("oni-icon")

        styleWriter.writeFontFace("seti","C:/oni/extensions/theme-icons-seti/icons/seti.woff", "woff")

        const iconDefinitions = this._activeIconTheme.iconDefinitions
        if (iconDefinitions) {
            Object.keys(iconDefinitions).forEach((definitionName: string) => {
                const definitionContents = iconDefinitions[definitionName]
                styleWriter.writeIcon(definitionName, definitionContents.fontColor, definitionContents.fontCharacter)
            })
        }

        newStyle.appendChild(document.createTextNode(styleWriter.style))

        document.head.appendChild(newStyle)

        this._onIconThemeChangedEvent.dispatch()
    }
}

import * as os from "os"

export class StyleWriter {
    private _style: string = ""

    public get style(): string {
        return this._style
    }

    constructor(
        private _primaryClassName: string
    ) {}

    public writeFontFace(fontFamily: string, sourceUrl: string, format: string): void {
        // Inspired by:
        // https://stackoverflow.com/questions/11355147/font-face-changing-via-javascript
        const fontFaceBlock = [
            "@font-face {",
            `   font-family: ${fontFamily};`,
            `   src: url('${sourceUrl}') format('${format}');`,
            "}",
        ]

        this._append(fontFaceBlock)

        const primaryClassBlock = [
            ".fa." + this._primaryClassName + " {",
                "font-family: " + fontFamily + ";",
            "}",
        ]

        this._append(primaryClassBlock)
    }

    public writeIcon(iconName: string, fontColor: string, fontCharacter: string): void {
        const iconClass = this._primaryClassName + "-" + iconName
        const selector = ".fa." + this._primaryClassName + "." + iconClass

        if (fontColor) {
            const primaryClassBlock = [
                selector + " {",
                    "color: " + fontColor + ";",
                "}"
            ]
            this._append(primaryClassBlock)
        }

        const pseudoElementBlock = [
            selector + ":before {",
            `   content: '${fontCharacter}';`,
            "}"
        ]
        this._append(pseudoElementBlock)
    }



    private _append(str: string[]): void {
        this._style += str.join(os.EOL) + os.EOL
    }
}