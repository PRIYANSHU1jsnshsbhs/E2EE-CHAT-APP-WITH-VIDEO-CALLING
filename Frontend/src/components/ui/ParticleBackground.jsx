import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

export default function ParticlesBackground() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const options = useMemo(
    () => ({
      background: {
        color: {
          value: "#000000",
        },
      },
      fullScreen: {
        enable: false,
      },
      fpsLimit: 60,

      particles: {
        number: {
          value: 120,
          density: {
            enable: true,
          },
        },

        color: {
          value: "#ffffff",
        },

        shape: {
          type: "circle",
        },

        opacity: {
          value: {
            min: 0.2,
            max: 0.8,
          },
        },

        size: {
          value: {
            min: 1,
            max: 2.5,
          },
        },

        move: {
          enable: true,
          speed: 0.25,
          direction: "none",
          random: true,
          outModes: {
            default: "out",
          },
        },

        links: {
          enable: false,
        },
      },

      detectRetina: true,
    }),
    []
  );

  if (!init) return null;

  return (
    <Particles
      className="absolute inset-0 -z-10"
      options={options}
    />
  );
}