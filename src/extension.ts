import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let originalColorCustomizations: any;
let originalTokenColorCustomizations: any;
let originalFontFamily: any;

function getCurrentMonth() {
    const date = new Date();
    return date.getMonth();
}

function saveOriginalConfigurations() {
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    const editorConfig = vscode.workspace.getConfiguration('editor');

    originalColorCustomizations = workbenchConfig.get('colorCustomizations');
    originalTokenColorCustomizations = editorConfig.get('tokenColorCustomizations');
    originalFontFamily = editorConfig.get('fontFamily');
}
function loadColorsFromFile(context: vscode.ExtensionContext, fileName: string) {
    try {
        const filePath = path.join(context.extensionPath, 'themes', fileName);
        console.log(`Cargando archivo de colores desde: ${filePath}`);
        const colors = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return colors;
    } catch (error) {
        vscode.window.showErrorMessage(`Error al cargar el archivo: ${fileName}. Verifica la ruta o el formato.`);
        console.error(`Error cargando archivo: ${fileName}`, error);
        return null;
    }
}

function mergeThemeColors(defaultColors: any, customColors: any) {
    if (!customColors) {
        console.log("Usando colores predeterminados.");
        return defaultColors;
    }
    const mergedColors = {
        colors: { ...defaultColors.colors },
        tokenColors: customColors.tokenColors
    };

    console.log("Colores combinados:", mergedColors);
    return mergedColors;
}


function applyThemeColorsForMonth(context: vscode.ExtensionContext) {
    const currentMonth = getCurrentMonth();

    // Carga de colores predeterminados y personalizados
    const defaultColors = loadColorsFromFile(context, 'default-colors.json');
    let customColors;

    if (currentMonth === 9) { // Octubre (Halloween)
        customColors = loadColorsFromFile(context, 'halloween-colors.json');
        vscode.window.showInformationMessage('Muajaja, this is Halloween! 🎃');
    } else if (currentMonth === 10 || currentMonth === 11) { // Noviembre y Diciembre (Navidad)
        customColors = loadColorsFromFile(context, 'holiday-colors.json');
        vscode.window.showInformationMessage('Hohoho, Merry Christmas 🎄');
    } else {
        vscode.window.showInformationMessage('Pretty Colors 🌷');
    }

    // Combinación de colores
    const finalColors = mergeThemeColors(defaultColors, customColors);

    try {
        // Aplicar colores al tema
        if (finalColors.colors) {
            vscode.workspace.getConfiguration('workbench')
                .update('colorCustomizations', finalColors.colors, vscode.ConfigurationTarget.Global)
                .then(() => {
                    console.log('Colores de fondo aplicados correctamente.');
                }, (error) => {
                    vscode.window.showErrorMessage('Error al aplicar los colores de fondo.');
                    console.error('Error al aplicar colores de fondo:', error);
                });
        }

        // Aplicar colores de tokens
        if (finalColors.tokenColors) {
            vscode.workspace.getConfiguration('editor')
                .update('tokenColorCustomizations', { textMateRules: finalColors.tokenColors }, vscode.ConfigurationTarget.Global)
                .then(() => {
                    console.log('Colores de token aplicados correctamente.');
                }, (error) => {
                    vscode.window.showErrorMessage('Error al aplicar los colores de tokens.');
                    console.error('Error al aplicar colores de tokens:', error);
                });
        }
    } catch (error) {
        vscode.window.showErrorMessage('Error al aplicar los colores. Puede haber una estructura circular.');
        console.error('Error al aplicar colores:', error);
    }
}

export function activate(context: vscode.ExtensionContext) {
    saveOriginalConfigurations();
    const config = vscode.workspace.getConfiguration('editor');
    config.update('fontFamily', 'Space Mono', vscode.ConfigurationTarget.Global)
        .then(() => {
            vscode.window.showInformationMessage('Tipografía cambiada a Space Mono');
        }, (error) => {
            vscode.window.showErrorMessage('Error al cambiar la tipografía: ' + error);
        });

    applyThemeColorsForMonth(context);

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            applyDecorations(editor);
        }
    });

    if (vscode.window.activeTextEditor) {
        applyDecorations(vscode.window.activeTextEditor);
    }
}

function applyDecorations(editor: vscode.TextEditor) {
    const regEx = /\/\/.*/g;
    const text = editor.document.getText();
    const decorations: vscode.DecorationOptions[] = [];
    let match;

    while ((match = regEx.exec(text)) !== null) {
        const startPos = editor.document.positionAt(match.index);
        const endPos = editor.document.positionAt(match.index + match[0].length);
        const decoration = { range: new vscode.Range(startPos, endPos) };
        decorations.push(decoration);
    }

    const decorationType = getDecorationForMonth();
    if (decorationType) {
        editor.setDecorations(decorationType, decorations);
    }
}

function getDecorationForMonth() {
    const currentMonth = getCurrentMonth();
    if (currentMonth === 9) {  
        return vscode.window.createTextEditorDecorationType({
            before: { contentText: '🎃 ', color: '#FFA500' }
        });
    } else if (currentMonth === 10 || currentMonth === 11) {  
        return vscode.window.createTextEditorDecorationType({
            before: { contentText: '🎄 ', color: '#FF0000' }
        });
    }
    return vscode.window.createTextEditorDecorationType({
        before: { contentText: '🌷 ', color: '#00FF00' } 
    });
}

export function deactivate() {
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    const editorConfig = vscode.workspace.getConfiguration('editor');

    workbenchConfig.update('colorCustomizations', originalColorCustomizations, vscode.ConfigurationTarget.Global)
        .then(() => {
            console.log('Configuración de colorCustomizations restaurada');
        }, (error) => {
            console.error('Error al restaurar colorCustomizations:', error);
        });

    editorConfig.update('tokenColorCustomizations', originalTokenColorCustomizations, vscode.ConfigurationTarget.Global)
        .then(() => {
            console.log('Configuración de tokenColorCustomizations restaurada');
        }, (error) => {
            console.error('Error al restaurar tokenColorCustomizations:', error);
        });

    editorConfig.update('fontFamily', originalFontFamily, vscode.ConfigurationTarget.Global)
        .then(() => {
            console.log('Tipografía original restaurada');
        }, (error) => {
            console.error('Error al restaurar la tipografía:', error);
        });
}
