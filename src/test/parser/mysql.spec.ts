import { DataSource } from 'typeorm';
import { Actor, Film, FilmActor, Staff } from '../../demo/entities/mysql';
import { init, LinqInferQueryBuilder } from '../../linq';
import { ExpressionAggregateFunc, OperatorConvertMapping } from '../../linq';
import { createConn } from '../../demo/util';
// test('test', () => {
//   expect(1 + 2).toEqual(3);
// });
let ds: DataSource;
beforeAll(async () => {
  ds = await createConn().initialize();
  init({ dbType: 'mysql' });
});

afterAll(async () => {
  await ds.destroy();
});

describe('mysql:test table alias and column', () => {
  test('test multi alias', async () => {
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .leftJoinAndSelect(Film, 'f2', ({ f, f2 }) => f.filmId == f2.filmId)
      .where(({ f, f2 }) => f.filmId == f2.filmId)
      ['parseExpression'](({ f, f2 }) => f.filmId == f2.filmId);
    expect(compileStr).toEqual('`f`.`film_id`=`f2`.`film_id`');
  });

  test('test alias and column convert', async () => {
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .leftJoinAndSelect(FilmActor, 'fc', ({ f, fc }) => f.filmId == fc.filmId)
      .leftJoinAndSelect(Actor, 'ac', ({ fc, ac }) => fc.actorId == ac.actorId)
      ['parseExpression'](({ f, fc }) => f.filmId == fc.filmId);
    expect(compileStr).toEqual('`f`.`film_id`=`fc`.`film_id`');
  });
});
describe('test param type', () => {
  test('test support object', async () => {
    const film = { id: 10 };
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => f.filmId == film.id, { filmId: film.id })
      ['parseExpression'](({ f }) => f.filmId == film.id);
    expect(compileStr).toEqual('`f`.`film_id`=:filmId');
  });

  test('test support basic type', async () => {
    const id = 10;
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => f.filmId == id, { id: id })
      ['parseExpression'](({ f }) => f.filmId == id);
    expect(compileStr).toEqual('`f`.`film_id`=:id');
  });

  test('test support Array', async () => {
    const idArray = [2, 3, 4];
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => idArray.includes(f.filmId), { idArray })
      ['parseExpression'](({ f }) => idArray.includes(f.filmId));
    expect(compileStr).toEqual('`f`.`film_id` in (:...idArray)');
  });

  test('test support constant number', async () => {
    const id = 10;
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => f.filmId == 10)
      ['parseExpression'](({ f }) => f.filmId == 10);
    expect(compileStr).toEqual("`f`.`film_id`='10'");
  });

  test('test support constant string', async () => {
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => f.title == 'Man')
      ['parseExpression'](({ f }) => f.filmId == 'Man');
    expect(compileStr).toEqual("`f`.`film_id`='Man'");
  });

  test('test support constant boolean', async () => {
    const compileStr = new LinqInferQueryBuilder<Staff>(ds)
      .create(Staff, 'f')
      .where(({ f }) => f.active == true)
      ['parseExpression'](({ f }) => f.active == true);
    expect(compileStr).toEqual('`f`.`active`=true');
  });
});
describe('test js logic support', () => {
  test('test support string.includes', async () => {
    const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => f.title.includes(man), {
        man: OperatorConvertMapping.currentConvert.like(man),
      })
      ['parseExpression'](({ f }) => f.title.includes(man));
    expect(compileStr).toEqual('`f`.`title` like :man ');
    expect(OperatorConvertMapping.currentConvert.like(man)).toEqual(`%Man%`);
  });

  test('test support string.startsWith', async () => {
    const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => f.title.startsWith(man), {
        man: OperatorConvertMapping.currentConvert.startsWith(man),
      })
      ['parseExpression'](({ f }) => f.title.startsWith(man));
    expect(compileStr).toEqual('`f`.`title` like :man ');
    expect(OperatorConvertMapping.currentConvert.startsWith(man)).toEqual(
      `Man%`,
    );
  });

  test('test support string.endsWith', async () => {
    const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => f.title.endsWith(man), {
        man: OperatorConvertMapping.currentConvert.endsWith(man),
      })
      ['parseExpression'](({ f }) => f.title.endsWith(man));
    expect(compileStr).toEqual('`f`.`title` like :man ');
    expect(OperatorConvertMapping.currentConvert.endsWith(man)).toEqual(`%Man`);
  });

  test('test support || operator', async () => {
    const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => f.filmId == 10 || f.filmId == 11)
      ['parseExpression'](({ f }) => f.filmId == 10 || f.filmId == 11);
    expect(compileStr).toEqual(" (`f`.`film_id`='10' or `f`.`film_id`='11') ");
  });

  test('test support && operator', async () => {
    const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => f.filmId == 10 && f.title == 'Man')
      ['parseExpression'](({ f }) => f.filmId == 10 && f.title == 'Man');
    expect(compileStr).toEqual(" (`f`.`film_id`='10' and `f`.`title`='Man') ");
  });

  test('test support == operator', async () => {
    const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => f.filmId == 10)
      ['parseExpression'](({ f }) => f.filmId == 10);
    expect(compileStr).toEqual("`f`.`film_id`='10'");
  });

  test('test support === operator', async () => {
    const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => f.filmId === 10)
      ['parseExpression'](({ f }) => f.filmId === 10);
    expect(compileStr).toEqual("`f`.`film_id`='10'");
  });

  test('test support != operator', async () => {
    const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => f.filmId != 10)
      ['parseExpression'](({ f }) => f.filmId != 10);
    expect(compileStr).toEqual("`f`.`film_id`<>'10'");
  });

  test('test support !== operator', async () => {
    const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(({ f }) => f.filmId !== 10)
      ['parseExpression'](({ f }) => f.filmId !== 10);
    expect(compileStr).toEqual("`f`.`film_id`<>'10'");
  });

  test('test support () operator', async () => {
    const man = 'Man';
    const idArray = [2, 3, 4, 10];
    const exceptId = 10;
    const compileStr = new LinqInferQueryBuilder<Film>(ds)
      .create(Film, 'f')
      .where(
        ({ f }) =>
          (f.filmId !== 10 || f.title == 'Man') && idArray.includes(f.filmId),
      )
      ['parseExpression'](
        ({ f }) =>
          (f.filmId !== 10 || f.title == 'Man') && idArray.includes(f.filmId),
      );
    expect(compileStr).toEqual(
      " ( (`f`.`film_id`<>'10' or `f`.`title`='Man')  and `f`.`film_id` in (:...idArray)) ",
    );
  });

  test('test support unary operator', async () => {
    const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Staff>(ds)
      .create(Staff, 'f')
      .where(({ f }) => !f.active)
      ['parseExpression'](({ f }) => !f.active);
    expect(compileStr).toEqual('`f`.`active` =false');
  });
  test('test support + operator', async () => {
    // const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Staff>(ds)
      .create(Staff, 'f')
      .select(({ f }) => {
        name: f.firstName + ' ' + f.lastName + '|' + f.email;
        address: f.address;
      })
      ['parseExpression'](({ f }) => {
        name: f.firstName + ' ' + f.lastName + '|' + f.email;
        address: f.address;
      });
    expect(compileStr).toEqual(
      ' CONCAT(`f`.`first_name`,\' \',`f`.`last_name`,\'|\',`f`.`email`) "name", `f`.`address` "address"',
    );
  });
  test('test support > operator', async () => {
    const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Staff>(ds)
      .create(Staff, 'f')
      .where(({ f }) => ExpressionAggregateFunc.len(f.firstName) > 3)
      ['parseExpression'](
        ({ f }) => ExpressionAggregateFunc.len(f.firstName) > 3,
      );
    expect(compileStr).toEqual(" length(`f`.`first_name`) >'3'");
  });
  test('test support <= operator', async () => {
    const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Staff>(ds)
      .create(Staff, 'f')
      .where(({ f }) => ExpressionAggregateFunc.len(f.firstName) <= 3)
      ['parseExpression'](
        ({ f }) => ExpressionAggregateFunc.len(f.firstName) <= 3,
      );
    expect(compileStr).toEqual(" length(`f`.`first_name`) <='3'");
  });
  test('test support < operator', async () => {
    const man = 'Man';
    const compileStr = new LinqInferQueryBuilder<Staff>(ds)
      .create(Staff, 'f')
      .where(({ f }) => ExpressionAggregateFunc.len(f.firstName) < 3)
      ['parseExpression'](
        ({ f }) => ExpressionAggregateFunc.len(f.firstName) < 3,
      );
    expect(compileStr).toEqual(" length(`f`.`first_name`) <'3'");
  });
  test('test support >= operator', async () => {
    const compileStr = new LinqInferQueryBuilder<Staff>(ds)
      .create(Staff, 'f')
      .where(({ f }) => ExpressionAggregateFunc.len(f.username) >= 3)
      ['parseExpression'](
        ({ f }) => ExpressionAggregateFunc.len(f.username) >= 3,
      );
    expect(compileStr).toEqual(" length(`f`.`username`) >='3'");
  });
  describe('test support AggregateFunc', () => {
    test('test support ExpressionAggregateFunc.subQuery', async () => {
      const compileStr = new LinqInferQueryBuilder<Staff>(ds)
        .create(Staff, 'f')
        .where(({ f }) =>
          ExpressionAggregateFunc.subQuery('f.address like %test%'),
        )
        ['parseExpression'](({ f }) =>
          ExpressionAggregateFunc.subQuery('f.address like %test%'),
        );
      expect(compileStr).toEqual(`f.address like %test%`);
    });
    test('test support ExpressionAggregateFunc.len', async () => {
      const compileStr = new LinqInferQueryBuilder<Staff>(ds)
        .create(Staff, 'f')
        .where(({ f }) => ExpressionAggregateFunc.len(f.username) >= 3)
        ['parseExpression'](
          ({ f }) => ExpressionAggregateFunc.len(f.username) >= 3,
        );
      expect(compileStr).toEqual(" length(`f`.`username`) >='3'");
    });

    test('test support multi Aggregate Function', async () => {
      const compileStr = new LinqInferQueryBuilder<Staff>(ds)
        .create(Staff, 'f')
        .where(
          ({ f }) =>
            ExpressionAggregateFunc.len(
              ExpressionAggregateFunc.cast(f.addressId, 'char'),
            ) >= 3,
        )
        ['parseExpression'](
          ({ f }) =>
            ExpressionAggregateFunc.len(
              ExpressionAggregateFunc.cast(f.addressId, 'char'),
            ) >= 3,
        );
      expect(compileStr).toEqual(
        " length( cast(`f`.`address_id` as char) ) >='3'",
      );
    });
    test('test support ExpressionAggregateFunc complex use', async () => {
      const compileStr = new LinqInferQueryBuilder<Staff>(ds)
        .create(Staff, 'f')
        .where(
          ({ f }) => ExpressionAggregateFunc.len(f.firstName + f.lastName) >= 3,
        )
        ['parseExpression'](
          ({ f }) => ExpressionAggregateFunc.len(f.firstName + f.lastName) >= 3,
        );
      expect(compileStr).toEqual(
        " length(CONCAT(`f`.`first_name`,`f`.`last_name`)) >='3'",
      );
    });
  });
});

// test('({ f, fc }) => f.filmId == fc.filmId', async () => {
//   const ds = await createConn();
//   init({dbType:'mysql'});
//   const compileStr = new LinqInferQueryBuilder<Film>(ds)
//     .create(Film, 'f')
//     .leftJoinAndSelect(FilmActor, 'fc', ({ f, fc }) => f.filmId == fc.filmId)
//     .leftJoinAndSelect(Actor, 'ac', ({ fc, ac }) => fc.actorId == ac.actorId)
//     .where(({f,fc,ac})=>f.filmId==fc.filmId&&fc.actorId==ac.actorId&&(f.description.includes('Man')||f.description.includes('Reach')))
//     ['parseExpression'](({f,fc,ac})=>f.filmId==fc.filmId&&fc.actorId==ac.actorId&&(f.description.includes('Man')||f.description.includes('Reach')));
//   expect(compileStr).toEqual('`f`.`film_id`="fc".`film_id`');
// });
