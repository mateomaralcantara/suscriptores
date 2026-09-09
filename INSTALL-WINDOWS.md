# Instalación en Windows

```powershell
cd "C:\Users\martin\Desktop\VSC\APPS\growth-reseller-lab-completo"
powershell -ExecutionPolicy Bypass -File ".\scripts\instalar.ps1"
powershell -ExecutionPolicy Bypass -File ".\scripts\iniciar.ps1" -Port 3004
```

Para instalarlo encima del proyecto anterior con respaldo automático:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\instalar-sobre-proyecto.ps1" -Destino "C:\Users\martin\Desktop\VSC\APPS\growth-reseller-lab"
```
