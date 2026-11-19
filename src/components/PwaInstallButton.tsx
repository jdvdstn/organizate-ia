import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isAppleMobileDevice() {
  const platform = navigator.platform || '';
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isRunningAsInstalledApp() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  );
}

export default function PwaInstallButton({
  notify,
}: {
  notify: (message: string) => void;
}) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const appleDevice = isAppleMobileDevice();

  useEffect(() => {
    setInstalled(isRunningAsInstalledApp());

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstalled(true);
      setShowInstructions(false);
      notify('Organízate IA quedó instalada.');
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [notify]);

  const handleInstall = async () => {
    if (appleDevice || !installPrompt) {
      setShowInstructions(true);
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        notify('El navegador está instalando Organízate IA.');
      }
    } catch {
      setShowInstructions(true);
    } finally {
      setInstallPrompt(null);
    }
  };

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        className="pwa-install-button"
        onClick={handleInstall}
        aria-haspopup="dialog"
        data-testid="button-install-app"
      >
        <Download size={14} aria-hidden="true" />
        Instalar aplicación
      </button>

      {showInstructions && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowInstructions(false);
            }
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-help-title"
            data-testid="dialog-install-instructions"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <h2 className="modal-title" id="pwa-help-title">
                Instalar Organízate
              </h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowInstructions(false)}
                aria-label="Cerrar instrucciones"
                data-testid="button-close-install-instructions"
              >
                <X size={17} />
              </button>
            </div>

            {appleDevice ? (
              <>
                <p className="page-intro">
                  En iPhone y iPad, la instalación se realiza desde Safari:
                </p>
                <ol className="pwa-help-list">
                  <li>Abre esta página en Safari.</li>
                  <li>Toca el botón Compartir.</li>
                  <li>Elige “Añadir a pantalla de inicio”.</li>
                  <li>Confirma con “Añadir”.</li>
                </ol>
              </>
            ) : (
              <>
                <p className="page-intro">
                  Si no apareció la ventana automática, instala la app desde el
                  menú del navegador:
                </p>
                <ol className="pwa-help-list">
                  <li>
                    En Android, abre el menú de Chrome y toca “Instalar
                    aplicación” o “Añadir a pantalla de inicio”.
                  </li>
                  <li>
                    En computadora, usa el icono de instalación de la barra de
                    direcciones o el menú del navegador.
                  </li>
                </ol>
              </>
            )}

            <div className="pwa-help-note">
              Se requiere conexión HTTPS. Al instalarla, tus tareas y horarios
              seguirán guardados en este navegador.
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowInstructions(false)}
                data-testid="button-dismiss-install-instructions"
              >
                Entendido
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
