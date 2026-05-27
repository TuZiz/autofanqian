# TypeScript 傻瓜规范

本文件给不太会 TypeScript 的 AI 阅读。写 TypeScript 时必须按这里做。禁止用 `any` 逃避问题。

## 1. TypeScript 不是 JavaScript 随便加类型

TypeScript 的目标是让数据结构、函数输入、函数输出更明确。不能把 JavaScript 写法照搬过来，再用 `any`、类型断言或注释骗过编译器。

正确：

```ts
interface User {
  id: string;
  name: string;
}

function getUserId(user: User): string {
  return user.id;
}
```

错误：

```ts
function getUserId(user: any) {
  return user.id;
}
```

错误原因：`any` 会关闭类型检查，后续字段写错也不会被发现。

## 2. 基础类型示例

正确：

```ts
const username: string = "Steve";
const age: number = 18;
const enabled: boolean = true;
```

也可以让 TypeScript 自动推断简单常量：

```ts
const username = "Steve";
const age = 18;
const enabled = true;
```

错误：

```ts
const username: any = "Steve";
const age: any = 18;
const enabled: any = true;
```

错误原因：基础值不需要 `any`。

## 3. 对象类型示例

正确：

```ts
interface User {
  id: string;
  name: string;
  level: number;
}

const user: User = {
  id: "uuid",
  name: "Steve",
  level: 10,
};
```

错误：

```ts
const user: any = {
  id: "uuid",
  name: "Steve",
};
```

错误原因：对象字段没有约束，缺少 `level` 也不会被发现。

对象字段可选时必须明确写 `?`：

```ts
interface UserProfile {
  id: string;
  nickname?: string;
}
```

不要用空对象代替真实类型：

```ts
// 错误
const profile: Record<string, unknown> = {};
```

除非确实是任意键值表，否则必须定义具体字段。

## 4. 函数类型示例

正确：

```ts
function getUserName(user: User): string {
  return user.name;
}
```

错误：

```ts
function getUserName(user) {
  return user.name;
}
```

错误原因：参数没有类型，调用方传错对象时不容易发现。

回调也必须写清楚：

```ts
function filterUsers(users: User[], minLevel: number): User[] {
  return users.filter((user) => user.level >= minLevel);
}
```

## 5. async 函数示例

正确：

```ts
async function loadUser(id: string): Promise<User | null> {
  return userRepository.findById(id);
}
```

错误：

```ts
async function loadUser(id) {
  return userRepository.findById(id);
}
```

错误原因：参数和返回值都不清楚。

处理异步失败时必须返回明确结构或抛出明确错误，不要返回混乱类型：

```ts
async function loadUserName(id: string): Promise<string | null> {
  const user = await loadUser(id);
  return user?.name ?? null;
}
```

## 6. 联合类型示例

固定选项必须用联合类型，不要用普通 `string`。

正确：

```ts
type UserRole = "admin" | "moderator" | "player";

interface User {
  id: string;
  name: string;
  role: UserRole;
}
```

错误：

```ts
interface User {
  id: string;
  name: string;
  role: string;
}
```

错误原因：`role` 可以被写成任何字符串，无法限制合法值。

## 7. Result 类型示例

需要表达成功或失败时，使用明确的联合类型。

正确：

```ts
type Result<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

function parseLevel(value: string): Result<number> {
  const level = Number(value);

  if (!Number.isFinite(level)) {
    return {
      success: false,
      error: "等级必须是数字",
    };
  }

  return {
    success: true,
    data: level,
  };
}
```

使用时必须先判断：

```ts
const result = parseLevel("10");

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

错误：

```ts
function parseLevel(value: string): any {
  return Number(value);
}
```

错误原因：调用方不知道是否可能失败。

## 8. 外部输入校验示例

外部输入可以先用 `unknown` 接住，但必须校验后才能使用。

外部输入包括：

- HTTP 请求体。
- URL 参数。
- localStorage。
- 第三方 API 返回。
- 数据库 JSON 字段。
- 用户上传内容。

正确：

```ts
interface CreateUserInput {
  name: string;
  level: number;
}

function isCreateUserInput(value: unknown): value is CreateUserInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const input = value as Record<string, unknown>;

  return typeof input.name === "string" && typeof input.level === "number";
}

function createUser(input: unknown): Result<CreateUserInput> {
  if (!isCreateUserInput(input)) {
    return {
      success: false,
      error: "用户输入格式错误",
    };
  }

  return {
    success: true,
    data: input,
  };
}
```

更推荐复用项目已有 zod schema 或已有校验工具。先查同目录和 `src/shared` 中是否已有 schema。

错误：

```ts
function createUser(input: any) {
  return {
    name: input.name,
    level: input.level,
  };
}
```

错误原因：外部输入未校验，字段可能不存在或类型错误。

## 9. 禁止写法合集

禁止：

```ts
const data: any = {};
```

原因：`data` 可以被当成任何东西，类型检查失效。

禁止：

```ts
const value = something as any;
```

原因：强制关闭 `something` 的类型检查。

禁止：

```ts
const value = something as unknown as User;
```

原因：双重断言是在骗编译器，运行时数据不一定是 `User`。

禁止：

```ts
// @ts-ignore
const name = user.profile.name;
```

原因：直接忽略错误会隐藏真实问题。

默认禁止：

```ts
// @ts-expect-error
const name = user.profile.name;
```

原因：只有已有测试场景确实需要验证错误类型时才允许。

禁止：

```ts
const list = [] as User[];
```

应该写：

```ts
const list: User[] = [];
```

禁止：

```ts
const response = await fetch(url);
const data = (await response.json()) as User;
```

应该先校验：

```ts
const response = await fetch(url);
const data: unknown = await response.json();

if (!isUser(data)) {
  throw new Error("用户数据格式错误");
}
```

## 10. 不会写类型时怎么办

必须按这个顺序做：

1. 查已有类型。
2. 查同目录代码。
3. 复用已有类型。
4. 查共享类型、schema、DTO。
5. 新增最小必要类型。
6. 不准用 `any`。
7. 不准用 `as any`。
8. 不准用 `as unknown as Xxx`。
9. 不准用类型断言骗编译器。

新增类型时必须靠近使用位置；多个模块共用时再放到共享类型目录。不要为了一个小函数新建庞大的类型文件。
