import type { Command, InfiniteMapPlugin, MapContext } from '../../types';

export function createCommandRunnerPlugin(): InfiniteMapPlugin {
  return {
    id: 'command-runner',
    provides: ['commands'],
    setup: (ctx: MapContext) => {
      // 注意：registry 可能会在 setup 之后才写入/更新，因此每次执行都从 store 读取最新值
      const getRegistry = () => ctx.store.get<Record<string, Command>>('commands:registry') ?? {};

      const run = (id: string, payload?: { source: 'keyboard' | 'toolbar' | 'menu' | 'api' }) => {
        const cmd = getRegistry()[id];
        if (!cmd) return;
        cmd.run(ctx, payload);
      };

      // 如果宿主（InfiniteMap）已经提供了 runCommand（例如带 hooks/权限控制），则不覆盖。
      if (!ctx.runCommand) ctx.runCommand = run;
      ctx.bus.on('command:run', ({ id, source }) => (ctx.runCommand ? ctx.runCommand(id, { source }) : run(id, { source })));
    },
  };
}

